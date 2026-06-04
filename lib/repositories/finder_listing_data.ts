// 분실물/습득물 게시글, 이미지, 검색 필터, 소유권 확인 SQL을 모아 둔 저장소다.
import { query } from '@/lib/db/query';

export interface ListingSearchInput {
  queryText?: string;
  category?: string;
  color?: string;
  location?: string;
  listingStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

// 지도 표시와 검색 응답에 필요한 게시글 좌표까지 포함한 요약 행 구조다.
export interface ListingSummaryRow {
  id: string;
  item_type: 'lost' | 'found';
  title: string;
  category: string;
  color: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  happened_at: string;
  listing_status: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  feature_notes: string;
  contact_note: string;
  owner_display_name: string;
  image_url: string | null;
  reward: number | null;
  match_count: number;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ListingImageRow {
  id: string;
  image_url: string;
  file_name: string;
  mime_type: string;
  is_primary: boolean;
}

export interface LegacyLostItemRow {
  id: string;
  owner_user_id: string;
  title: string;
  location: string;
  time_label: string;
  reward: number;
  status: 'safe' | 'lost' | 'contact';
  photo_status: 'locked' | 'pending' | 'approved';
  distance: string;
  owner_name: string;
  description: string;
  map_x: number;
  map_y: number;
  thread_id: string | null;
  photo_asset_path: string | null;
  source_device_id: string | null;
  ble_code: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  created_at: string;
  listing_status: 'open' | 'matched' | 'resolved' | 'archived';
  happened_at: string | null;
}

export interface LegacyLostItemChatRow {
  id: string;
  owner_user_id: string;
  title: string;
  reward: number;
  status: 'safe' | 'lost' | 'contact';
  photo_status: 'locked' | 'pending' | 'approved';
  owner_name: string;
  thread_id: string | null;
}

export interface AutoLostItemInput {
  ownerUserId: string;
  ownerName: string;
  title: string;
  location: string;
  timeLabel: string;
  lostAt: string;
  reward: number;
  status: 'safe' | 'lost' | 'contact';
  photoStatus: 'locked' | 'pending' | 'approved';
  distance: string;
  description: string;
  mapX: number;
  mapY: number;
  photoAssetPath: string | null;
  sourceDeviceId: string;
  lastDetectedLatitude?: number | null;
  lastDetectedLongitude?: number | null;
  lastDetectedAccuracyMeters?: number | null;
  listingStatus?: 'open' | 'matched' | 'resolved' | 'archived';
}

// 분실물과 습득물 검색에서 공통으로 쓰는 필터 조건을 SQL에 붙인다.
function pushCommonFilters(
  conditions: string[],
  values: unknown[],
  input: ListingSearchInput,
  aliasPrefix: string,
  locationColumn: string,
  happenedAtColumn: string,
) {
  if (input.queryText) {
    const value = `%${input.queryText.trim()}%`;
    values.push(value);
    const index = values.length;
    conditions.push(
      `(
        ${aliasPrefix}.title ilike $${index}
        or ${aliasPrefix}.description ilike $${index}
        or ${aliasPrefix}.feature_notes ilike $${index}
        or ${aliasPrefix}.search_keywords ilike $${index}
      )`,
    );
  }

  if (input.category) {
    values.push(input.category);
    conditions.push(`${aliasPrefix}.category = $${values.length}`);
  }

  if (input.color) {
    values.push(input.color);
    conditions.push(`${aliasPrefix}.color = $${values.length}`);
  }

  if (input.location) {
    values.push(`%${input.location.trim()}%`);
    conditions.push(`${locationColumn} ilike $${values.length}`);
  }

  if (input.listingStatus) {
    values.push(input.listingStatus);
    conditions.push(`${aliasPrefix}.listing_status = $${values.length}`);
  }

  if (input.dateFrom) {
    values.push(input.dateFrom);
    conditions.push(`${happenedAtColumn} >= $${values.length}::timestamptz`);
  }

  if (input.dateTo) {
    values.push(input.dateTo);
    conditions.push(`${happenedAtColumn} <= $${values.length}::timestamptz`);
  }
}

export async function listLostListings(input: ListingSearchInput = {}) {
  const conditions = ['true'];
  const values: unknown[] = [];
  pushCommonFilters(
    conditions,
    values,
    input,
    'lost_items',
    'lost_items.location',
    'lost_items.lost_at',
  );

  const result = await query<ListingSummaryRow>(
    `
      select
        lost_items.id,
        'lost'::text as item_type,
        lost_items.title,
        lost_items.category,
        lost_items.color,
        lost_items.location,
        lost_items.latitude,
        lost_items.longitude,
        lost_items.accuracy_meters,
        lost_items.lost_at::text as happened_at,
        lost_items.listing_status,
        lost_items.description,
        lost_items.feature_notes,
        lost_items.contact_note,
        coalesce(users.public_name, users.name) as owner_display_name,
        lost_items.reward,
        (
          select image_url
          from item_images
          where lost_item_id = lost_items.id
          order by is_primary desc, created_at asc
          limit 1
        ) as image_url,
        (
          select count(*)
          from matches
          where matches.lost_item_id = lost_items.id
            and matches.match_status != 'dismissed'
        )::int as match_count,
        lost_items.owner_user_id,
        lost_items.created_at::text as created_at,
        lost_items.updated_at::text as updated_at
      from lost_items
      inner join users on users.id = lost_items.owner_user_id
      where ${conditions.join(' and ')}
      order by lost_items.lost_at desc, lost_items.created_at desc
    `,
    values,
  );

  return result.rows;
}

export async function listFoundListings(input: ListingSearchInput = {}) {
  const conditions = ['true'];
  const values: unknown[] = [];
  pushCommonFilters(
    conditions,
    values,
    input,
    'found_items',
    'found_items.found_location',
    'found_items.found_at',
  );

  const result = await query<ListingSummaryRow>(
    `
      select
        found_items.id,
        'found'::text as item_type,
        found_items.title,
        found_items.category,
        found_items.color,
        found_items.found_location as location,
        found_items.latitude,
        found_items.longitude,
        found_items.accuracy_meters,
        found_items.found_at::text as happened_at,
        found_items.listing_status,
        found_items.description,
        found_items.feature_notes,
        found_items.contact_note,
        coalesce(users.public_name, users.name) as owner_display_name,
        null::integer as reward,
        (
          select image_url
          from item_images
          where found_item_id = found_items.id
          order by is_primary desc, created_at asc
          limit 1
        ) as image_url,
        (
          select count(*)
          from matches
          where matches.found_item_id = found_items.id
            and matches.match_status != 'dismissed'
        )::int as match_count,
        found_items.reporter_user_id as owner_user_id,
        found_items.created_at::text as created_at,
        found_items.updated_at::text as updated_at
      from found_items
      inner join users on users.id = found_items.reporter_user_id
      where ${conditions.join(' and ')}
      order by found_items.found_at desc, found_items.created_at desc
    `,
    values,
  );

  return result.rows;
}

export async function listLostListingsByUser(userId: string) {
  return listLostListingsForOwner('lost_items.owner_user_id = $1', [userId]);
}

export async function listRecentLostListings(limit = 6) {
  return listLostListingsForOwner('true', [], limit);
}

async function listLostListingsForOwner(whereClause: string, values: unknown[], limit?: number) {
  const result = await query<ListingSummaryRow>(
    `
      select
        lost_items.id,
        'lost'::text as item_type,
        lost_items.title,
        lost_items.category,
        lost_items.color,
        lost_items.location,
        lost_items.latitude,
        lost_items.longitude,
        lost_items.accuracy_meters,
        lost_items.lost_at::text as happened_at,
        lost_items.listing_status,
        lost_items.description,
        lost_items.feature_notes,
        lost_items.contact_note,
        coalesce(users.public_name, users.name) as owner_display_name,
        lost_items.reward,
        (
          select image_url
          from item_images
          where lost_item_id = lost_items.id
          order by is_primary desc, created_at asc
          limit 1
        ) as image_url,
        (
          select count(*)
          from matches
          where matches.lost_item_id = lost_items.id
            and matches.match_status != 'dismissed'
        )::int as match_count,
        lost_items.owner_user_id,
        lost_items.created_at::text as created_at,
        lost_items.updated_at::text as updated_at
      from lost_items
      inner join users on users.id = lost_items.owner_user_id
      where ${whereClause}
      order by lost_items.lost_at desc, lost_items.created_at desc
      ${limit != null ? `limit ${limit}` : ''}
    `,
    values,
  );
  return result.rows;
}

export async function listFoundListingsByUser(userId: string) {
  return listFoundListingsForReporter('found_items.reporter_user_id = $1', [userId]);
}

export async function listRecentFoundListings(limit = 6) {
  return listFoundListingsForReporter('true', [], limit);
}

async function listFoundListingsForReporter(whereClause: string, values: unknown[], limit?: number) {
  const result = await query<ListingSummaryRow>(
    `
      select
        found_items.id,
        'found'::text as item_type,
        found_items.title,
        found_items.category,
        found_items.color,
        found_items.found_location as location,
        found_items.latitude,
        found_items.longitude,
        found_items.accuracy_meters,
        found_items.found_at::text as happened_at,
        found_items.listing_status,
        found_items.description,
        found_items.feature_notes,
        found_items.contact_note,
        coalesce(users.public_name, users.name) as owner_display_name,
        null::integer as reward,
        (
          select image_url
          from item_images
          where found_item_id = found_items.id
          order by is_primary desc, created_at asc
          limit 1
        ) as image_url,
        (
          select count(*)
          from matches
          where matches.found_item_id = found_items.id
            and matches.match_status != 'dismissed'
        )::int as match_count,
        found_items.reporter_user_id as owner_user_id,
        found_items.created_at::text as created_at,
        found_items.updated_at::text as updated_at
      from found_items
      inner join users on users.id = found_items.reporter_user_id
      where ${whereClause}
      order by found_items.found_at desc, found_items.created_at desc
      ${limit != null ? `limit ${limit}` : ''}
    `,
    values,
  );
  return result.rows;
}

export async function getLostListingById(itemId: string) {
  const rows = await listLostListingsForOwner('lost_items.id = $1', [itemId], 1);
  return rows[0] ?? null;
}

export async function getFoundListingById(itemId: string) {
  const rows = await listFoundListingsForReporter('found_items.id = $1', [itemId], 1);
  return rows[0] ?? null;
}

export async function listLegacyLostItems() {
  const result = await query<LegacyLostItemRow>(
    `
      select lost_items.id, lost_items.owner_user_id, lost_items.title, lost_items.location,
             lost_items.time_label, lost_items.reward, lost_items.status, lost_items.photo_status,
             lost_items.distance, lost_items.owner_name, lost_items.description,
             lost_items.map_x, lost_items.map_y, lost_items.thread_id, lost_items.photo_asset_path,
             lost_items.source_device_id, ble_devices.ble_code,
             lost_items.latitude, lost_items.longitude, lost_items.accuracy_meters,
             lost_items.created_at::text as created_at,
             lost_items.listing_status, lost_items.lost_at::text as happened_at
      from lost_items
      left join ble_devices on ble_devices.id = lost_items.source_device_id
      order by lost_items.created_at desc
    `,
  );
  return result.rows;
}

export async function getLegacyLostItemById(itemId: string) {
  const result = await query<LegacyLostItemChatRow>(
    `
      select id, owner_user_id, title, reward, status, photo_status, owner_name, thread_id
      from lost_items
      where id = $1
      limit 1
    `,
    [itemId],
  );
  return result.rows[0] ?? null;
}

export async function findLostItemBySourceDeviceId(sourceDeviceId: string) {
  const result = await query<LegacyLostItemRow>(
    `
      select id, title, location, time_label, reward, status, photo_status, distance,
             owner_name, description, map_x, map_y, thread_id, photo_asset_path,
             source_device_id, latitude, longitude, accuracy_meters
      from lost_items
      where source_device_id = $1
      limit 1
    `,
    [sourceDeviceId],
  );
  return result.rows[0] ?? null;
}

export async function upsertLostItemFromDevice(input: AutoLostItemInput) {
  const category = inferCategoryFromTitle(input.title);
  const color = inferColorFromTitle(input.title);
  const featureNotes = input.description.trim();
  const searchKeywords = [
    input.title,
    category,
    color,
    input.location,
    input.description,
  ]
    .filter((value) => value.trim().length > 0)
    .join(' ');
  const contactNote = '앱 내 문의 기능으로 연락해 주세요.';
  const existing = await findLostItemBySourceDeviceId(input.sourceDeviceId);
  if (existing) {
    const result = await query<{ id: string }>(
      `
        update lost_items
        set
          owner_user_id = $2,
          title = $3,
          location = $4,
          time_label = $5,
          reward = $6,
          status = $7,
          photo_status = $8,
          distance = $9,
          owner_name = $10,
          description = $11,
          map_x = $12,
          map_y = $13,
          photo_asset_path = $14,
          category = $15,
          color = $16,
          lost_at = $17::timestamptz,
          listing_status = $18,
          feature_notes = $19,
          search_keywords = $20,
          contact_note = $21,
          source_device_id = $22,
          latitude = $23,
          longitude = $24,
          accuracy_meters = $25,
          updated_at = now()
        where id = $1
        returning id
      `,
      [
        existing.id,
        input.ownerUserId,
        input.title,
        input.location,
        input.timeLabel,
        input.reward,
        input.status,
        input.photoStatus,
        input.distance,
        input.ownerName,
        input.description,
        input.mapX,
        input.mapY,
        input.photoAssetPath,
        category,
        color,
        input.lostAt,
        input.listingStatus ?? 'open',
        featureNotes,
        searchKeywords,
        contactNote,
        input.sourceDeviceId,
        input.lastDetectedLatitude ?? null,
        input.lastDetectedLongitude ?? null,
        input.lastDetectedAccuracyMeters ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  const result = await query<{ id: string }>(
    `
      insert into lost_items (
        owner_user_id, title, location, time_label, reward, status, photo_status, distance,
        owner_name, description, map_x, map_y, photo_asset_path, category, color, lost_at,
        listing_status, feature_notes, search_keywords, contact_note, source_device_id,
        latitude, longitude, accuracy_meters, created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::timestamptz,
        $17, $18, $19, $20, $21, $22, $23, $24, now(), now()
      )
      returning id
    `,
    [
      input.ownerUserId,
      input.title,
      input.location,
      input.timeLabel,
      input.reward,
      input.status,
      input.photoStatus,
      input.distance,
      input.ownerName,
      input.description,
      input.mapX,
      input.mapY,
      input.photoAssetPath,
      category,
      color,
      input.lostAt,
      input.listingStatus ?? 'open',
      featureNotes,
      searchKeywords,
      contactNote,
      input.sourceDeviceId,
      input.lastDetectedLatitude ?? null,
      input.lastDetectedLongitude ?? null,
      input.lastDetectedAccuracyMeters ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

function inferCategoryFromTitle(title: string) {
  if (title.includes('지갑')) return '지갑';
  if (title.includes('에어팟')) return '전자기기';
  if (title.includes('백팩') || title.includes('가방')) return '가방';
  if (title.includes('휴대폰') || title.includes('갤럭시') || title.includes('태블릿')) {
    return '전자기기';
  }
  return '기타';
}

function inferColorFromTitle(title: string) {
  if (title.includes('갈색')) return '갈색';
  if (title.includes('버건디')) return '버건디';
  if (title.includes('검정')) return '검정';
  if (title.includes('흰색')) return '흰색';
  if (title.includes('파랑')) return '파랑';
  return '미상';
}

export async function listLostItemImages(itemId: string) {
  const result = await query<ListingImageRow>(
    `
      select id, image_url, file_name, mime_type, is_primary
      from item_images
      where lost_item_id = $1
      order by is_primary desc, created_at asc
    `,
    [itemId],
  );
  return result.rows;
}

export async function listFoundItemImages(itemId: string) {
  const result = await query<ListingImageRow>(
    `
      select id, image_url, file_name, mime_type, is_primary
      from item_images
      where found_item_id = $1
      order by is_primary desc, created_at asc
    `,
    [itemId],
  );
  return result.rows;
}

export async function replaceLostItemImages(input: {
  itemId: string;
  uploadedByUserId: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  await query('delete from item_images where lost_item_id = $1', [input.itemId]);

  for (const image of input.images) {
    await query(
      `
        insert into item_images (
          lost_item_id, uploaded_by_user_id, image_url, file_name, mime_type, is_primary
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.itemId,
        input.uploadedByUserId,
        image.imageUrl,
        image.fileName,
        image.mimeType,
        image.isPrimary,
      ],
    );
  }
}

export async function replaceFoundItemImages(input: {
  itemId: string;
  uploadedByUserId: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  await query('delete from item_images where found_item_id = $1', [input.itemId]);

  for (const image of input.images) {
    await query(
      `
        insert into item_images (
          found_item_id, uploaded_by_user_id, image_url, file_name, mime_type, is_primary
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.itemId,
        input.uploadedByUserId,
        image.imageUrl,
        image.fileName,
        image.mimeType,
        image.isPrimary,
      ],
    );
  }
}

// 분실물 등록 시 앱에서 받은 좌표와 상세 정보를 lost_items에 저장한다.
export async function createLostListing(input: {
  ownerUserId: string;
  ownerName: string;
  title: string;
  category: string;
  color: string;
  location: string;
  lostAt: string;
  timeLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  reward: number;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  searchKeywords: string;
  contactNote: string;
  photoAssetPath: string | null;
  legacyStatus: 'safe' | 'lost' | 'contact';
  legacyPhotoStatus: 'locked' | 'pending' | 'approved';
  mapX: number;
  mapY: number;
}) {
  const result = await query<{ id: string }>(
    `
      insert into lost_items (
        owner_user_id, title, location, time_label, reward, status, photo_status, distance,
        owner_name, description, map_x, map_y, photo_asset_path,
        category, color, lost_at, listing_status, feature_notes, search_keywords, contact_note,
        latitude, longitude, accuracy_meters, created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16::timestamptz, $17, $18, $19, $20, $21, $22, $23, now(), now()
      )
      returning id
    `,
    [
      input.ownerUserId,
      input.title,
      input.location,
      input.timeLabel,
      input.reward,
      input.legacyStatus,
      input.legacyPhotoStatus,
      input.location,
      input.ownerName,
      input.description,
      input.mapX,
      input.mapY,
      input.photoAssetPath,
      input.category,
      input.color,
      input.lostAt,
      input.listingStatus,
      input.featureNotes,
      input.searchKeywords,
      input.contactNote,
      input.latitude ?? null,
      input.longitude ?? null,
      input.accuracyMeters ?? null,
    ],
  );
  return result.rows[0];
}

// 분실물 수정 시 좌표, 상태, 설명, 이미지 연결 정보를 함께 갱신한다.
export async function updateLostListing(input: {
  itemId: string;
  ownerName: string;
  title: string;
  category: string;
  color: string;
  location: string;
  lostAt: string;
  timeLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  reward: number;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  searchKeywords: string;
  contactNote: string;
  photoAssetPath: string | null;
  legacyStatus: 'safe' | 'lost' | 'contact';
  legacyPhotoStatus: 'locked' | 'pending' | 'approved';
  mapX: number;
  mapY: number;
}) {
  const result = await query<{ id: string }>(
    `
      update lost_items
      set
        title = $2,
        location = $3,
        time_label = $4,
        reward = $5,
        status = $6,
        distance = $3,
        photo_status = $7,
        owner_name = $8,
        description = $9,
        map_x = $10,
        map_y = $11,
        photo_asset_path = $12,
        category = $13,
        color = $14,
        lost_at = $15::timestamptz,
        listing_status = $16,
        feature_notes = $17,
        search_keywords = $18,
        contact_note = $19,
        latitude = $20,
        longitude = $21,
        accuracy_meters = $22,
        updated_at = now()
      where id = $1
      returning id
    `,
    [
      input.itemId,
      input.title,
      input.location,
      input.timeLabel,
      input.reward,
      input.legacyStatus,
      input.legacyPhotoStatus,
      input.ownerName,
      input.description,
      input.mapX,
      input.mapY,
      input.photoAssetPath,
      input.category,
      input.color,
      input.lostAt,
      input.listingStatus,
      input.featureNotes,
      input.searchKeywords,
      input.contactNote,
      input.latitude ?? null,
      input.longitude ?? null,
      input.accuracyMeters ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

export async function deleteLostListing(itemId: string) {
  await query('delete from lost_items where id = $1', [itemId]);
}

export async function updateLegacyLostItemReward(input: {
  itemId: string;
  reward: number;
}) {
  const result = await query<{ id: string }>(
    `
      update lost_items
      set reward = $2
      where id = $1
      returning id
    `,
    [input.itemId, input.reward],
  );
  return result.rows[0] ?? null;
}

export async function updateLegacyLostItemChatState(input: {
  itemId: string;
  status?: 'safe' | 'lost' | 'contact';
  photoStatus?: 'locked' | 'pending' | 'approved';
  threadId?: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      update lost_items
      set status = coalesce($2, status),
          photo_status = coalesce($3, photo_status),
          thread_id = coalesce($4, thread_id)
      where id = $1
      returning id
    `,
    [
      input.itemId,
      input.status ?? null,
      input.photoStatus ?? null,
      input.threadId ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

// 습득물 등록 시 습득 위치 좌표와 보관/연락 정보를 found_items에 저장한다.
export async function createFoundListing(input: {
  reporterUserId: string;
  title: string;
  category: string;
  color: string;
  foundLocation: string;
  foundAt: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  storageNote: string | null;
  searchKeywords: string;
  contactNote: string;
}) {
  const result = await query<{ id: string }>(
    `
      insert into found_items (
        reporter_user_id, title, category, color, found_location, found_at,
        latitude, longitude, accuracy_meters,
        listing_status, description, feature_notes, storage_note, search_keywords, contact_note
      )
      values ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      returning id
    `,
    [
      input.reporterUserId,
      input.title,
      input.category,
      input.color,
      input.foundLocation,
      input.foundAt,
      input.latitude ?? null,
      input.longitude ?? null,
      input.accuracyMeters ?? null,
      input.listingStatus,
      input.description,
      input.featureNotes,
      input.storageNote,
      input.searchKeywords,
      input.contactNote,
    ],
  );
  return result.rows[0];
}

// 습득물 수정 시 좌표, 상태, 설명, 이미지 연결 정보를 함께 갱신한다.
export async function updateFoundListing(input: {
  itemId: string;
  title: string;
  category: string;
  color: string;
  foundLocation: string;
  foundAt: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  storageNote: string | null;
  searchKeywords: string;
  contactNote: string;
}) {
  const result = await query<{ id: string }>(
    `
      update found_items
      set
        title = $2,
        category = $3,
        color = $4,
        found_location = $5,
        found_at = $6::timestamptz,
        latitude = $7,
        longitude = $8,
        accuracy_meters = $9,
        listing_status = $10,
        description = $11,
        feature_notes = $12,
        storage_note = $13,
        search_keywords = $14,
        contact_note = $15,
        updated_at = now()
      where id = $1
      returning id
    `,
    [
      input.itemId,
      input.title,
      input.category,
      input.color,
      input.foundLocation,
      input.foundAt,
      input.latitude ?? null,
      input.longitude ?? null,
      input.accuracyMeters ?? null,
      input.listingStatus,
      input.description,
      input.featureNotes,
      input.storageNote,
      input.searchKeywords,
      input.contactNote,
    ],
  );
  return result.rows[0] ?? null;
}

export async function deleteFoundListing(itemId: string) {
  await query('delete from found_items where id = $1', [itemId]);
}

export async function listDistinctCategories() {
  const result = await query<{ value: string }>(
    `
      select distinct value
      from (
        select category as value from lost_items
        union
        select category as value from found_items
      ) categories
      where value is not null and value != ''
      order by value asc
    `,
  );
  return result.rows.map((row) => row.value);
}

export async function listDistinctColors() {
  const result = await query<{ value: string }>(
    `
      select distinct value
      from (
        select color as value from lost_items
        union
        select color as value from found_items
      ) colors
      where value is not null and value != ''
      order by value asc
    `,
  );
  return result.rows.map((row) => row.value);
}

export async function getLostListingOwner(itemId: string) {
  const result = await query<{ owner_user_id: string }>(
    'select owner_user_id from lost_items where id = $1 limit 1',
    [itemId],
  );
  return result.rows[0]?.owner_user_id ?? null;
}

export async function getFoundListingOwner(itemId: string) {
  const result = await query<{ reporter_user_id: string }>(
    'select reporter_user_id from found_items where id = $1 limit 1',
    [itemId],
  );
  return result.rows[0]?.reporter_user_id ?? null;
}
