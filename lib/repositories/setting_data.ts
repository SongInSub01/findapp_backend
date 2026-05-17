// BLE 알림 설정과 안심 구역 정보를 읽고 쓰는 설정 저장소다.
import { query } from '@/lib/db/query';

// 사용자별 안전지대를 좌표와 반경까지 포함해 조회한다.
export async function listSafeZones(userId: string) {
  const result = await query<{
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
  }>(
    `
      select id, name, address, latitude, longitude, radius_meters
      from safe_zones
      where user_id = $1
      order by created_at asc
    `,
    [userId],
  );
  return result.rows;
}

export async function getAlertSettings(userId: string) {
  const result = await query<{
    distance_meters: number;
    disconnect_minutes: number;
    vibration_enabled: boolean;
    sound_enabled: boolean;
    auto_approve_photos: boolean;
    keep_photo_private_by_default: boolean;
    default_reward: number;
    map_theme: 'dark' | 'light';
  }>(
    `
      select distance_meters, disconnect_minutes, vibration_enabled,
             sound_enabled, auto_approve_photos, keep_photo_private_by_default,
             default_reward, map_theme
      from alert_settings
      where user_id = $1
      limit 1
    `,
    [userId],
  );
  return result.rows[0] ?? null;
}

// 알림 설정은 사용자별로 하나만 유지되도록 있으면 수정하고 없으면 생성한다.
export async function upsertAlertSettings(input: {
  userId: string;
  distanceMeters: number;
  disconnectMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoApprovePhotos: boolean;
  keepPhotoPrivateByDefault: boolean;
  defaultReward: number;
  mapTheme: 'dark' | 'light';
}) {
  await query(
    `
      insert into alert_settings (
        user_id, distance_meters, disconnect_minutes, vibration_enabled,
        sound_enabled, auto_approve_photos, keep_photo_private_by_default,
        default_reward, map_theme
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (user_id) do update
      set distance_meters = excluded.distance_meters,
          disconnect_minutes = excluded.disconnect_minutes,
          vibration_enabled = excluded.vibration_enabled,
          sound_enabled = excluded.sound_enabled,
          auto_approve_photos = excluded.auto_approve_photos,
          keep_photo_private_by_default = excluded.keep_photo_private_by_default,
          default_reward = excluded.default_reward,
          map_theme = excluded.map_theme
    `,
    [
      input.userId,
      input.distanceMeters,
      input.disconnectMinutes,
      input.vibrationEnabled,
      input.soundEnabled,
      input.autoApprovePhotos,
      input.keepPhotoPrivateByDefault,
      input.defaultReward,
      input.mapTheme,
    ],
  );
}

// 새 안전지대를 주소, 좌표, 반경 정보와 함께 저장한다.
export async function createSafeZone(input: {
  userId: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters: number;
}) {
  const result = await query<{ id: string }>(
    `
      insert into safe_zones (user_id, name, address, latitude, longitude, radius_meters)
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [
      input.userId,
      input.name,
      input.address,
      input.latitude ?? null,
      input.longitude ?? null,
      input.radiusMeters,
    ],
  );
  return result.rows[0] ?? null;
}

// 기존 안전지대의 주소, 좌표, 반경 정보를 갱신한다.
export async function updateSafeZone(input: {
  userId: string;
  zoneId: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters: number;
}) {
  const result = await query<{ id: string }>(
    `
      update safe_zones
      set name = $3,
          address = $4,
          latitude = $5,
          longitude = $6,
          radius_meters = $7
      where id = $1
        and user_id = $2
      returning id
    `,
    [
      input.zoneId,
      input.userId,
      input.name,
      input.address,
      input.latitude ?? null,
      input.longitude ?? null,
      input.radiusMeters,
    ],
  );
  return result.rows[0] ?? null;
}
