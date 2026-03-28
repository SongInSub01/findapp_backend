// 찾아줘 핵심 서비스 레이어다.
// 부트스트랩 조립, 게시글 CRUD, 매칭 계산, 문의 등록 흐름을 한곳에서 조합한다.
import type {
  AlertSettingsDto,
  BleDeviceDto,
  ChatThreadDto,
  DashboardSummaryDto,
  FinderBootstrapDto,
  InquiryDto,
  ListingDetailDto,
  LostItemDto,
  ListingSummaryDto,
  MatchDto,
  MatchStatus,
  NotificationDto,
  ReportDto,
  SafeZoneDto,
} from '@/lib/contracts/app-types';
import {
  createNotification,
  listNotifications,
  listReports,
} from '@/lib/repositories/activity_data';
import {
  createInquiry,
  listInquiriesByUser,
} from '@/lib/repositories/finder_inquiry_data';
import {
  listMatchesForListing,
  listMatchesForUser,
  replaceMatchesForFoundItem,
  replaceMatchesForLostItem,
} from '@/lib/repositories/finder_match_data';
import {
  createFoundListing,
  createLostListing,
  deleteFoundListing,
  deleteLostListing,
  getFoundListingById,
  getFoundListingOwner,
  getLegacyLostItemById,
  getLostListingById,
  getLostListingOwner,
  listDistinctCategories,
  listDistinctColors,
  listFoundItemImages,
  listFoundListings,
  listFoundListingsByUser,
  listLegacyLostItems,
  listLostItemImages,
  listLostListings,
  listLostListingsByUser,
  listRecentFoundListings,
  listRecentLostListings,
  replaceFoundItemImages,
  replaceLostItemImages,
  type ListingSummaryRow,
  updateLegacyLostItemReward,
  updateFoundListing,
  updateLostListing,
} from '@/lib/repositories/finder_listing_data';
import { listChatThreadsForUser, updateChatThread } from '@/lib/repositories/chat_data';
import { listBleDevices } from '@/lib/repositories/device_data';
import { getAlertSettings, listSafeZones } from '@/lib/repositories/setting_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';
import { formatRelativeDateLabel, nowLabel } from '@/lib/utils/time_label';

// 찾아줘 핵심 서비스 레이어:
// 부트스트랩, 분실물/습득물 CRUD, 매칭 계산, 문의 등록을 한곳에서 조합한다.
function toNotificationDto(row: {
  id: string;
  title: string;
  body: string;
  time_label: string;
  type: 'alert' | 'approval' | 'info' | 'report';
  is_read: boolean;
}): NotificationDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    timeLabel: row.time_label,
    type: row.type,
    isRead: row.is_read,
  };
}

function toInquiryDto(row: {
  id: string;
  category: 'report' | 'support' | 'moderation';
  title: string;
  body: string;
  status: 'open' | 'reviewing' | 'resolved' | 'closed';
  related_item_type: 'lost' | 'found' | null;
  related_item_id: string | null;
  created_at: string;
}): InquiryDto {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    status: row.status,
    relatedItemType: row.related_item_type,
    relatedItemId: row.related_item_id,
    createdAt: row.created_at,
    createdAtLabel: formatRelativeDateLabel(row.created_at),
  };
}

function toListingSummaryDto(
  row: ListingSummaryRow,
  requesterUserId: string,
): ListingSummaryDto {
  return {
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    category: row.category,
    color: row.color,
    location: row.location,
    happenedAt: row.happened_at,
    happenedAtLabel: formatRelativeDateLabel(row.happened_at),
    listingStatus: row.listing_status,
    description: row.description,
    featureNotes: row.feature_notes,
    contactNote: row.contact_note,
    ownerDisplayName: row.owner_display_name,
    imageUrl: row.image_url,
    reward: row.reward,
    matchCount: row.match_count,
    isMine: row.owner_user_id === requesterUserId,
  };
}

function toBleDeviceDto(row: {
  id: string;
  name: string;
  icon_key: string;
  status: 'safe' | 'lost' | 'contact';
  location: string;
  last_seen: string;
  ble_code: string;
  map_x: number;
  map_y: number;
  distance: string | null;
  reward: number | null;
  photo_asset_path: string | null;
}): BleDeviceDto {
  return {
    id: row.id,
    name: row.name,
    iconKey: row.icon_key,
    status: row.status,
    location: row.location,
    lastSeen: row.last_seen,
    bleCode: row.ble_code,
    mapX: Number(row.map_x),
    mapY: Number(row.map_y),
    distance: row.distance,
    reward: row.reward,
    photoAssetPath: row.photo_asset_path,
  };
}

function toLostItemDto(row: {
  id: string;
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
}): LostItemDto {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    timeLabel: row.time_label,
    reward: row.reward,
    status: row.status,
    photoStatus: row.photo_status,
    distance: row.distance,
    ownerName: row.owner_name,
    description: row.description,
    mapX: Number(row.map_x),
    mapY: Number(row.map_y),
    threadId: row.thread_id,
    photoAssetPath: row.photo_asset_path,
  };
}

function toChatThreadDto(row: {
  id: string;
  item_id: string;
  item_title: string;
  item_status: 'safe' | 'lost' | 'contact';
  last_message: string;
  last_time: string;
  unread: number;
  photo_status: 'locked' | 'pending' | 'approved';
  other_user: string;
  reward: number | null;
  messages: Array<{
    id: string;
    text: string;
    sender: 'me' | 'other' | 'system';
    time_label: string;
    type: 'text' | 'photoRequest' | 'photoApproved' | 'report';
  }>;
}): ChatThreadDto {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    itemStatus: row.item_status,
    lastMessage: row.last_message,
    lastTime: row.last_time,
    unread: row.unread,
    photoStatus: row.photo_status,
    otherUser: row.other_user,
    reward: row.reward,
    messages: row.messages.map((message) => ({
      id: message.id,
      text: message.text,
      sender: message.sender,
      timeLabel: message.time_label,
      type: message.type,
    })),
  };
}

function toSafeZoneDto(row: {
  id: string;
  name: string;
  address: string;
  radius_meters: number;
}): SafeZoneDto {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    radiusMeters: row.radius_meters,
  };
}

function toAlertSettingsDto(row: {
  distance_meters: number;
  disconnect_minutes: number;
  vibration_enabled: boolean;
  sound_enabled: boolean;
  auto_approve_photos: boolean;
  keep_photo_private_by_default: boolean;
} | null): AlertSettingsDto {
  return {
    distanceMeters: row?.distance_meters ?? 10,
    disconnectMinutes: row?.disconnect_minutes ?? 5,
    vibrationEnabled: row?.vibration_enabled ?? true,
    soundEnabled: row?.sound_enabled ?? true,
    autoApprovePhotos: row?.auto_approve_photos ?? false,
    keepPhotoPrivateByDefault: row?.keep_photo_private_by_default ?? true,
  };
}

function toReportDto(row: {
  id: string;
  target_title: string;
  reason: string;
  created_at_label: string;
  status_label: string;
}): ReportDto {
  return {
    id: row.id,
    targetTitle: row.target_title,
    reason: row.reason,
    createdAtLabel: row.created_at_label,
    statusLabel: row.status_label,
  };
}

async function buildMatchDtos(
  requesterUserId: string,
  rawMatches: Awaited<ReturnType<typeof listMatchesForUser>>,
): Promise<MatchDto[]> {
  const results: MatchDto[] = [];

  for (const rawMatch of rawMatches) {
    const [lostItem, foundItem] = await Promise.all([
      getLostListingById(rawMatch.lost_item_id),
      getFoundListingById(rawMatch.found_item_id),
    ]);

    if (!lostItem || !foundItem) {
      continue;
    }

    results.push({
      id: rawMatch.id,
      score: Number(rawMatch.score),
      matchStatus: rawMatch.match_status,
      reasonSummary: rawMatch.reason_summary,
      detailScores: rawMatch.detail_scores,
      lostItem: toListingSummaryDto(lostItem, requesterUserId),
      foundItem: toListingSummaryDto(foundItem, requesterUserId),
    });
  }

  return results;
}

function buildDashboardSummary(input: {
  myLostItems: ListingSummaryDto[];
  myFoundItems: ListingSummaryDto[];
  notifications: NotificationDto[];
  matches: MatchDto[];
}): DashboardSummaryDto {
  return {
    openLostCount: input.myLostItems.filter((item) => item.listingStatus === 'open').length,
    openFoundCount: input.myFoundItems.filter((item) => item.listingStatus === 'open').length,
    matchedCount: input.matches.length,
    unreadNotificationCount: input.notifications.filter((item) => !item.isRead).length,
  };
}

function tokenize(value: string) {
  return new Set(
    value
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0),
  );
}

function overlapScore(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function calculateTimeScore(left: string, right: string) {
  const diffHours = Math.abs(
    new Date(left).getTime() - new Date(right).getTime(),
  ) / (1000 * 60 * 60);

  if (diffHours <= 1) {
    return 0.15;
  }
  if (diffHours <= 6) {
    return 0.12;
  }
  if (diffHours <= 24) {
    return 0.1;
  }
  if (diffHours <= 72) {
    return 0.05;
  }
  return 0;
}

function calculatePairScore(lostItem: ListingSummaryRow, foundItem: ListingSummaryRow) {
  const categoryScore = lostItem.category === foundItem.category ? 0.35 : 0;
  const colorScore = lostItem.color === foundItem.color ? 0.2 : 0;
  const locationScore = overlapScore(
    tokenize(lostItem.location),
    tokenize(foundItem.location),
  ) * 0.2;
  const keywordScore = overlapScore(
    tokenize(`${lostItem.title} ${lostItem.description} ${lostItem.feature_notes}`),
    tokenize(`${foundItem.title} ${foundItem.description} ${foundItem.feature_notes}`),
  ) * 0.1;
  const timeScore = calculateTimeScore(lostItem.happened_at, foundItem.happened_at);
  const score = Number(
    (categoryScore + colorScore + locationScore + keywordScore + timeScore).toFixed(2),
  );

  const reasons: string[] = [];
  if (categoryScore > 0) {
    reasons.push('카테고리 일치');
  }
  if (colorScore > 0) {
    reasons.push('색상 일치');
  }
  if (locationScore >= 0.08) {
    reasons.push('위치 유사');
  }
  if (timeScore >= 0.1) {
    reasons.push('시간대 근접');
  }
  if (keywordScore >= 0.05) {
    reasons.push('특징 문구 유사');
  }

  return {
    score,
    detailScores: {
      category: Number(categoryScore.toFixed(2)),
      color: Number(colorScore.toFixed(2)),
      location: Number(locationScore.toFixed(2)),
      time: Number(timeScore.toFixed(2)),
      keywords: Number(keywordScore.toFixed(2)),
    },
    reasonSummary: reasons.length > 0
      ? reasons.join(', ')
      : '기본 조건 일부가 유사합니다.',
  };
}

async function refreshMatchesForLostItem(lostItemId: string) {
  const lostItem = await getLostListingById(lostItemId);
  if (!lostItem) {
    return;
  }

  const candidates = (await listFoundListings()).filter(
    (item) => item.listing_status !== 'archived' && item.listing_status !== 'resolved',
  );

  const matches = candidates
    .map((candidate) => {
      const scoreResult = calculatePairScore(lostItem, candidate);
      return {
        foundItemId: candidate.id,
        score: scoreResult.score,
        matchStatus: 'suggested' as MatchStatus,
        reasonSummary: scoreResult.reasonSummary,
        detailScores: scoreResult.detailScores,
      };
    })
    .filter((match) => match.score >= 0.45);

  await replaceMatchesForLostItem({ lostItemId, matches });
}

async function refreshMatchesForFoundItem(foundItemId: string) {
  const foundItem = await getFoundListingById(foundItemId);
  if (!foundItem) {
    return;
  }

  const candidates = (await listLostListings()).filter(
    (item) => item.listing_status !== 'archived' && item.listing_status !== 'resolved',
  );

  const matches = candidates
    .map((candidate) => {
      const scoreResult = calculatePairScore(candidate, foundItem);
      return {
        lostItemId: candidate.id,
        score: scoreResult.score,
        matchStatus: 'suggested' as MatchStatus,
        reasonSummary: scoreResult.reasonSummary,
        detailScores: scoreResult.detailScores,
      };
    })
    .filter((match) => match.score >= 0.45);

  await replaceMatchesForFoundItem({ foundItemId, matches });
}

function buildLegacyStatus(listingStatus: 'open' | 'matched' | 'resolved' | 'archived') {
  switch (listingStatus) {
    case 'resolved':
      return 'safe' as const;
    case 'matched':
      return 'contact' as const;
    case 'archived':
    case 'open':
    default:
      return 'lost' as const;
  }
}

function buildLegacyPhotoStatus(imageCount: number) {
  return imageCount > 0 ? ('approved' as const) : ('locked' as const);
}

function buildSearchKeywords(input: {
  title: string;
  category: string;
  color: string;
  location: string;
  description: string;
  featureNotes: string;
}) {
  return [
    input.title,
    input.category,
    input.color,
    input.location,
    input.description,
    input.featureNotes,
  ].join(' ');
}

function buildPseudoCoordinate(seed: string, salt: number) {
  const total = [...seed].reduce((sum, char, index) => {
    return sum + (char.codePointAt(0) ?? 0) * (index + salt);
  }, 0);

  return Number((((total % 1000) / 1000) * 0.9 + 0.05).toFixed(4));
}

export async function getFinderBootstrap(input: {
  email?: string;
  loginId?: string;
} = {}): Promise<FinderBootstrapDto> {
  const user = await requireRequestedUser(
    input,
    '사용자를 찾을 수 없습니다. 먼저 회원가입 후 로그인해 주세요.',
  );

  const [
    myDeviceRows,
    legacyLostRows,
    chatThreadRows,
    safeZoneRows,
    alertSettingsRow,
    reportRows,
    myLostRows,
    myFoundRows,
    recentLostRows,
    recentFoundRows,
    matchRows,
    notificationRows,
    inquiryRows,
    categories,
    colors,
  ] = await Promise.all([
    listBleDevices(user.id),
    listLegacyLostItems(),
    listChatThreadsForUser(user.id),
    listSafeZones(user.id),
    getAlertSettings(user.id),
    listReports(),
    listLostListingsByUser(user.id),
    listFoundListingsByUser(user.id),
    listRecentLostListings(),
    listRecentFoundListings(),
    listMatchesForUser(user.id),
    listNotifications(user.id),
    listInquiriesByUser(user.id),
    listDistinctCategories(),
    listDistinctColors(),
  ]);

  const myDevices = myDeviceRows.map(toBleDeviceDto);
  const lostItems = legacyLostRows.map(toLostItemDto);
  const chatThreads = chatThreadRows.map(toChatThreadDto);
  const safeZones = safeZoneRows.map(toSafeZoneDto);
  const alertSettings = toAlertSettingsDto(alertSettingsRow);
  const myLostItems = myLostRows.map((item) => toListingSummaryDto(item, user.id));
  const myFoundItems = myFoundRows.map((item) => toListingSummaryDto(item, user.id));
  const recentLostItems = recentLostRows.map((item) => toListingSummaryDto(item, user.id));
  const recentFoundItems = recentFoundRows.map((item) => toListingSummaryDto(item, user.id));
  const notifications = notificationRows.map(toNotificationDto);
  const reports = reportRows.map(toReportDto);
  const inquiries = inquiryRows.map(toInquiryDto);
  const suggestedMatches = await buildMatchDtos(user.id, matchRows);

  return {
    userProfile: {
      id: user.id,
      name: user.name,
      email: user.email,
      loginId: user.login_id,
      publicName: user.public_name,
      role: user.role ?? 'user',
      phoneNumber: user.phone_number ?? null,
      profileBio: user.profile_bio ?? null,
    },
    myDevices,
    lostItems,
    chatThreads,
    safeZones,
    alertSettings,
    reports,
    dashboardSummary: buildDashboardSummary({
      myLostItems,
      myFoundItems,
      notifications,
      matches: suggestedMatches,
    }),
    myLostItems,
    myFoundItems,
    recentLostItems,
    recentFoundItems,
    suggestedMatches,
    notifications,
    inquiries,
    availableCategories: categories,
    availableColors: colors,
  };
}

export async function searchFinderListings(input: {
  loginId?: string;
  email?: string;
  itemType?: 'lost' | 'found' | 'all';
  queryText?: string;
  category?: string;
  color?: string;
  location?: string;
  listingStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId, email: input.email },
    '검색을 수행할 사용자를 찾을 수 없습니다.',
  );

  const searchInput = {
    queryText: input.queryText,
    category: input.category,
    color: input.color,
    location: input.location,
    listingStatus: input.listingStatus,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  const [lostRows, foundRows] = await Promise.all([
    input.itemType == 'found' ? Promise.resolve([]) : listLostListings(searchInput),
    input.itemType == 'lost' ? Promise.resolve([]) : listFoundListings(searchInput),
  ]);

  return [...lostRows, ...foundRows]
    .map((row) => toListingSummaryDto(row, user.id))
    .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt));
}

export async function getFinderListingDetail(input: {
  loginId?: string;
  email?: string;
  itemType: 'lost' | 'found';
  itemId: string;
}): Promise<ListingDetailDto> {
  const user = await requireRequestedUser(
    { loginId: input.loginId, email: input.email },
    '상세 정보를 확인할 사용자를 찾을 수 없습니다.',
  );

  const summary = input.itemType == 'lost'
    ? await getLostListingById(input.itemId)
    : await getFoundListingById(input.itemId);

  if (!summary) {
    throw new Error('해당 게시글을 찾을 수 없습니다.');
  }

  const [images, relatedMatches] = await Promise.all([
    input.itemType == 'lost'
      ? listLostItemImages(input.itemId)
      : listFoundItemImages(input.itemId),
    listMatchesForListing({ itemType: input.itemType, itemId: input.itemId }),
  ]);

  return {
    ...toListingSummaryDto(summary, user.id),
    createdAt: summary.happened_at,
    updatedAt: summary.happened_at,
    images: images.map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      fileName: image.file_name,
      mimeType: image.mime_type,
      isPrimary: image.is_primary,
    })),
    matchCount: relatedMatches.length,
  };
}

export async function createFinderLostItem(input: {
  loginId: string;
  title: string;
  category: string;
  color: string;
  location: string;
  happenedAt: string;
  reward: number;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  contactNote: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '분실물 등록을 위한 사용자를 찾을 수 없습니다.',
  );

  const created = await createLostListing({
    ownerUserId: user.id,
    ownerName: user.public_name,
    title: input.title,
    category: input.category,
    color: input.color,
    location: input.location,
    lostAt: input.happenedAt,
    reward: input.reward,
    listingStatus: input.listingStatus,
    description: input.description,
    featureNotes: input.featureNotes,
    searchKeywords: buildSearchKeywords(input),
    contactNote: input.contactNote,
    photoAssetPath: input.images[0]?.imageUrl ?? null,
    legacyStatus: buildLegacyStatus(input.listingStatus),
    legacyPhotoStatus: buildLegacyPhotoStatus(input.images.length),
    mapX: buildPseudoCoordinate(input.location, 3),
    mapY: buildPseudoCoordinate(input.title, 7),
  });

  await replaceLostItemImages({
    itemId: created.id,
    uploadedByUserId: user.id,
    images: input.images,
  });
  await refreshMatchesForLostItem(created.id);

  const matchRows = await listMatchesForListing({ itemType: 'lost', itemId: created.id });
  if (matchRows.length > 0) {
    await createNotification({
      userId: user.id,
      title: '새 분실물 등록 후 유사 매칭이 감지되었습니다',
      body: `${input.title}과(와) 유사한 습득물이 ${matchRows.length}건 발견되었습니다.`,
      timeLabel: '방금 전',
      type: 'info',
    });
  }

  return getFinderListingDetail({
    loginId: input.loginId,
    itemType: 'lost',
    itemId: created.id,
  });
}

export async function updateFinderLostItem(input: {
  loginId: string;
  itemId: string;
  title: string;
  category: string;
  color: string;
  location: string;
  happenedAt: string;
  reward: number;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  contactNote: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '분실물 수정 권한을 확인할 수 없습니다.',
  );

  const ownerUserId = await getLostListingOwner(input.itemId);
  if (ownerUserId !== user.id) {
    throw new Error('본인이 등록한 분실물만 수정할 수 있습니다.');
  }

  const updated = await updateLostListing({
    itemId: input.itemId,
    ownerName: user.public_name,
    title: input.title,
    category: input.category,
    color: input.color,
    location: input.location,
    lostAt: input.happenedAt,
    reward: input.reward,
    listingStatus: input.listingStatus,
    description: input.description,
    featureNotes: input.featureNotes,
    searchKeywords: buildSearchKeywords(input),
    contactNote: input.contactNote,
    photoAssetPath: input.images[0]?.imageUrl ?? null,
    legacyStatus: buildLegacyStatus(input.listingStatus),
    legacyPhotoStatus: buildLegacyPhotoStatus(input.images.length),
    mapX: buildPseudoCoordinate(input.location, 3),
    mapY: buildPseudoCoordinate(input.title, 7),
  });

  if (!updated) {
    throw new Error('수정할 분실물을 찾지 못했습니다.');
  }

  await replaceLostItemImages({
    itemId: input.itemId,
    uploadedByUserId: user.id,
    images: input.images,
  });
  await refreshMatchesForLostItem(input.itemId);

  return getFinderListingDetail({
    loginId: input.loginId,
    itemType: 'lost',
    itemId: input.itemId,
  });
}

export async function deleteFinderLostItem(input: {
  loginId: string;
  itemId: string;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '분실물 삭제 권한을 확인할 수 없습니다.',
  );
  const ownerUserId = await getLostListingOwner(input.itemId);
  if (ownerUserId !== user.id) {
    throw new Error('본인이 등록한 분실물만 삭제할 수 있습니다.');
  }

  await deleteLostListing(input.itemId);
}

export async function saveFinderLostItemReward(input: {
  loginId?: string;
  email?: string;
  itemId: string;
  reward: number;
}) {
  const user = await requireRequestedUser(input, '사례금 수정 사용자를 찾을 수 없습니다.');
  const item = await getLegacyLostItemById(input.itemId);

  if (!item) {
    throw new Error('분실물을 찾을 수 없습니다.');
  }

  if (item.owner_user_id !== user.id) {
    throw new Error('본인이 등록한 분실물만 사례금을 수정할 수 있습니다.');
  }

  await updateLegacyLostItemReward({
    itemId: input.itemId,
    reward: input.reward,
  });

  if (item.thread_id) {
    await updateChatThread({
      threadId: item.thread_id,
      reward: input.reward,
    });
  }

  await createNotification({
    userId: user.id,
    title: '사례금 수정 완료',
    body: `${item.title} 사례금이 ${input.reward}원으로 저장되었습니다.`,
    timeLabel: nowLabel(),
    type: 'info',
  });
}

export async function createFinderFoundItem(input: {
  loginId: string;
  title: string;
  category: string;
  color: string;
  location: string;
  happenedAt: string;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  storageNote?: string | null;
  contactNote: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '습득물 등록을 위한 사용자를 찾을 수 없습니다.',
  );

  const created = await createFoundListing({
    reporterUserId: user.id,
    title: input.title,
    category: input.category,
    color: input.color,
    foundLocation: input.location,
    foundAt: input.happenedAt,
    listingStatus: input.listingStatus,
    description: input.description,
    featureNotes: input.featureNotes,
    storageNote: input.storageNote ?? null,
    searchKeywords: buildSearchKeywords(input),
    contactNote: input.contactNote,
  });

  await replaceFoundItemImages({
    itemId: created.id,
    uploadedByUserId: user.id,
    images: input.images,
  });
  await refreshMatchesForFoundItem(created.id);

  return getFinderListingDetail({
    loginId: input.loginId,
    itemType: 'found',
    itemId: created.id,
  });
}

export async function updateFinderFoundItem(input: {
  loginId: string;
  itemId: string;
  title: string;
  category: string;
  color: string;
  location: string;
  happenedAt: string;
  listingStatus: 'open' | 'matched' | 'resolved' | 'archived';
  description: string;
  featureNotes: string;
  storageNote?: string | null;
  contactNote: string;
  images: Array<{
    imageUrl: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '습득물 수정 권한을 확인할 수 없습니다.',
  );

  const ownerUserId = await getFoundListingOwner(input.itemId);
  if (ownerUserId !== user.id) {
    throw new Error('본인이 등록한 습득물만 수정할 수 있습니다.');
  }

  const updated = await updateFoundListing({
    itemId: input.itemId,
    title: input.title,
    category: input.category,
    color: input.color,
    foundLocation: input.location,
    foundAt: input.happenedAt,
    listingStatus: input.listingStatus,
    description: input.description,
    featureNotes: input.featureNotes,
    storageNote: input.storageNote ?? null,
    searchKeywords: buildSearchKeywords(input),
    contactNote: input.contactNote,
  });

  if (!updated) {
    throw new Error('수정할 습득물을 찾지 못했습니다.');
  }

  await replaceFoundItemImages({
    itemId: input.itemId,
    uploadedByUserId: user.id,
    images: input.images,
  });
  await refreshMatchesForFoundItem(input.itemId);

  return getFinderListingDetail({
    loginId: input.loginId,
    itemType: 'found',
    itemId: input.itemId,
  });
}

export async function deleteFinderFoundItem(input: {
  loginId: string;
  itemId: string;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '습득물 삭제 권한을 확인할 수 없습니다.',
  );
  const ownerUserId = await getFoundListingOwner(input.itemId);
  if (ownerUserId !== user.id) {
    throw new Error('본인이 등록한 습득물만 삭제할 수 있습니다.');
  }
  await deleteFoundListing(input.itemId);
}

export async function listFinderMatches(input: {
  loginId?: string;
  email?: string;
}) {
  const user = await requireRequestedUser(
    input,
    '매칭 목록을 확인할 사용자를 찾을 수 없습니다.',
  );
  const rawMatches = await listMatchesForUser(user.id);
  return buildMatchDtos(user.id, rawMatches);
}

export async function submitFinderInquiry(input: {
  loginId: string;
  category: 'report' | 'support' | 'moderation';
  title: string;
  body: string;
  relatedItemType?: 'lost' | 'found';
  relatedItemId?: string;
}) {
  const user = await requireRequestedUser(
    { loginId: input.loginId },
    '문의 등록 사용자를 찾을 수 없습니다.',
  );

  const created = await createInquiry({
    userId: user.id,
    category: input.category,
    title: input.title,
    body: input.body,
    relatedItemType: input.relatedItemType ?? null,
    relatedItemId: input.relatedItemId ?? null,
  });

  const adminUser = await requireRequestedUser(
    { loginId: 'admin' },
    '관리자 계정을 찾지 못했습니다.',
  );
  await createNotification({
    userId: adminUser.id,
    title: '새 문의가 접수되었습니다',
    body: `[${input.category}] ${input.title}`,
    timeLabel: '방금 전',
    type: 'report',
  });

  return created.id;
}
