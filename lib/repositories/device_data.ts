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
    map_x: number;
    map_y: number;
    distance: string | null;
    reward: number | null;
    photo_asset_path: string | null;
  }>(
    `
      select id, name, icon_key, status, location, last_seen, ble_code, map_x, map_y,
             distance, reward, photo_asset_path
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
        map_x, map_y, distance, reward, photo_asset_path
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
        map_x = $9,
        map_y = $10,
        distance = $11,
        reward = $12,
        photo_asset_path = $13
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
      input.mapX,
      input.mapY,
      input.distance ?? null,
      input.reward ?? null,
      input.photoAssetPath ?? null,
    ],
  );
  return result.rows[0] ?? null;
}
