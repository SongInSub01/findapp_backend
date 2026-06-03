// BLE 기기 등록 정보와 마지막 추적 상태를 읽고 쓰는 저장소다.
import { query } from '@/lib/db/query';

// BLE 기기는 사용자별 등록 정보와 마지막 추적 상태를 함께 저장한다.
export async function listBleDevices(userId: string) {
  const result = await query<{
    id: string;
    name: string;
    icon_key: string;
    status: 'safe' | 'lost' | 'contact';
    location: string;
    last_seen: string;
    ble_code: string;
    last_signal_at: string;
    ble_status: 'near' | 'far' | 'risk' | 'disconnected' | 'lost' | 'rediscovered';
    map_x: number;
    map_y: number;
    distance: string | null;
    reward: number | null;
    photo_asset_path: string | null;
    last_rssi: number | null;
    last_detected_latitude: number | null;
    last_detected_longitude: number | null;
    last_detected_accuracy_meters: number | null;
    focused_scan_until: string | null;
    rediscovered_at: string | null;
    battery_percent: number | null;
    battery_checked_at: string | null;
  }>(
    `
      select id, name, icon_key, status, location, last_seen, ble_code, map_x, map_y,
             last_signal_at, ble_status, distance, reward, photo_asset_path,
             last_rssi, last_detected_latitude, last_detected_longitude,
             last_detected_accuracy_meters, focused_scan_until, rediscovered_at,
             battery_percent, battery_checked_at
      from ble_devices
      where user_id = $1
      order by created_at asc
    `,
    [userId],
  );
  return result.rows;
}

export async function createBleDevice(input: {
  userId: string;
  name: string;
  iconKey: string;
  status: 'safe' | 'lost' | 'contact';
  location: string;
  lastSeen: string;
  bleCode: string;
  lastSignalAt?: string;
  bleStatus?: 'near' | 'far' | 'risk' | 'disconnected' | 'lost' | 'rediscovered';
  mapX: number;
  mapY: number;
  distance?: string | null;
  reward?: number | null;
  photoAssetPath?: string | null;
}) {
  const result = await query(
    `
      insert into ble_devices (
        user_id, name, icon_key, status, location, last_seen, ble_code,
        last_signal_at, ble_status, map_x, map_y, distance, reward, photo_asset_path
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      returning id
    `,
    [
      input.userId,
      input.name,
      input.iconKey,
      input.status,
      input.location,
      input.lastSeen,
      input.bleCode,
      input.lastSignalAt ?? new Date().toISOString(),
      input.bleStatus ?? 'near',
      input.mapX,
      input.mapY,
      input.distance ?? null,
      input.reward ?? null,
      input.photoAssetPath ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateBleDevice(input: {
  deviceId: string;
  userId: string;
  name: string;
  iconKey: string;
  status: 'safe' | 'lost' | 'contact';
  location: string;
  lastSeen: string;
  bleCode: string;
  lastSignalAt?: string;
  bleStatus?: 'near' | 'far' | 'risk' | 'disconnected' | 'lost' | 'rediscovered';
  mapX: number;
  mapY: number;
  distance?: string | null;
  reward?: number | null;
  photoAssetPath?: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      update ble_devices
      set
        name = $3,
        icon_key = $4,
        status = $5,
        location = $6,
        last_seen = $7,
        ble_code = $8,
        last_signal_at = coalesce($9, last_signal_at),
        ble_status = coalesce($10, ble_status),
        map_x = $11,
        map_y = $12,
        distance = $13,
        reward = $14,
        photo_asset_path = $15
      where id = $1
        and user_id = $2
      returning id
    `,
    [
      input.deviceId,
      input.userId,
      input.name,
      input.iconKey,
      input.status,
      input.location,
      input.lastSeen,
      input.bleCode,
      input.lastSignalAt ?? null,
      input.bleStatus ?? null,
      input.mapX,
      input.mapY,
      input.distance ?? null,
      input.reward ?? null,
      input.photoAssetPath ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

// 로그인한 사용자가 소유한 BLE 기기만 삭제해 같은 태그를 다시 등록할 수 있게 한다.
export async function deleteBleDevice(input: {
  deviceId: string;
  userId: string;
}) {
  const result = await query<{ id: string }>(
    `
      delete from ble_devices
      where id = $1
        and user_id = $2
      returning id
    `,
    [input.deviceId, input.userId],
  );
  return result.rows[0] ?? null;
}
