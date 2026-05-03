// 사용자별 현재 위치 스냅샷을 읽고 쓰는 저장소다.
import { query } from '@/lib/db/query';

export async function getCurrentLocation(userId: string) {
  const result = await query<{
    latitude: number;
    longitude: number;
    accuracy_meters: number | null;
    updated_at: string;
  }>(
    `
      select latitude, longitude, accuracy_meters, updated_at
      from current_locations
      where user_id = $1
      limit 1
    `,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function upsertCurrentLocation(input: {
  userId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}) {
  const result = await query<{
    latitude: number;
    longitude: number;
    accuracy_meters: number | null;
    updated_at: string;
  }>(
    `
      insert into current_locations (
        user_id, latitude, longitude, accuracy_meters, updated_at
      )
      values ($1, $2, $3, $4, now())
      on conflict (user_id) do update
      set latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy_meters = excluded.accuracy_meters,
          updated_at = excluded.updated_at
      returning latitude, longitude, accuracy_meters, updated_at
    `,
    [input.userId, input.latitude, input.longitude, input.accuracyMeters ?? null],
  );
  return result.rows[0] ?? null;
}
