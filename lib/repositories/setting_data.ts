// BLE 알림 설정과 안심 구역 정보를 읽고 쓰는 설정 저장소다.
import { query } from '@/lib/db/query';

export async function listSafeZones(userId: string) {
  const result = await query<{
    id: string;
    name: string;
    address: string;
    radius_meters: number;
  }>(
    `
      select id, name, address, radius_meters
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
  }>(
    `
      select distance_meters, disconnect_minutes, vibration_enabled,
             sound_enabled, auto_approve_photos, keep_photo_private_by_default
      from alert_settings
      where user_id = $1
      limit 1
    `,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function upsertAlertSettings(input: {
  userId: string;
  distanceMeters: number;
  disconnectMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoApprovePhotos: boolean;
  keepPhotoPrivateByDefault: boolean;
}) {
  await query(
    `
      insert into alert_settings (
        user_id, distance_meters, disconnect_minutes, vibration_enabled,
        sound_enabled, auto_approve_photos, keep_photo_private_by_default
      )
      values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (user_id) do update
      set distance_meters = excluded.distance_meters,
          disconnect_minutes = excluded.disconnect_minutes,
          vibration_enabled = excluded.vibration_enabled,
          sound_enabled = excluded.sound_enabled,
          auto_approve_photos = excluded.auto_approve_photos,
          keep_photo_private_by_default = excluded.keep_photo_private_by_default
    `,
    [
      input.userId,
      input.distanceMeters,
      input.disconnectMinutes,
      input.vibrationEnabled,
      input.soundEnabled,
      input.autoApprovePhotos,
      input.keepPhotoPrivateByDefault,
    ],
  );
}

export async function createSafeZone(input: {
  userId: string;
  name: string;
  address: string;
  radiusMeters: number;
}) {
  const result = await query<{ id: string }>(
    `
      insert into safe_zones (user_id, name, address, radius_meters)
      values ($1, $2, $3, $4)
      returning id
    `,
    [input.userId, input.name, input.address, input.radiusMeters],
  );
  return result.rows[0] ?? null;
}

export async function updateSafeZone(input: {
  userId: string;
  zoneId: string;
  name: string;
  address: string;
  radiusMeters: number;
}) {
  const result = await query<{ id: string }>(
    `
      update safe_zones
      set name = $3,
          address = $4,
          radius_meters = $5
      where id = $1
        and user_id = $2
      returning id
    `,
    [input.zoneId, input.userId, input.name, input.address, input.radiusMeters],
  );
  return result.rows[0] ?? null;
}
