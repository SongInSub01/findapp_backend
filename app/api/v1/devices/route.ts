// BLE 기기 목록 조회와 새 기기 등록을 담당하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createBleDevice, listBleDevices } from '@/lib/repositories/device_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

// 앱에서 보낸 BLE 기기 등록 값을 검증하고, 중복 BLE 코드는 DB 제약 조건으로 막는다.
const createDeviceSchema = z.object({
  name: z.string().min(1),
  iconKey: z.string().min(1),
  status: z.enum(['safe', 'lost', 'contact']),
  location: z.string().min(1),
  lastSeen: z.string().min(1),
  bleCode: z.string().min(1),
  lastSignalAt: z.string().min(1).optional(),
  bleStatus: z.enum(['near', 'far', 'risk', 'disconnected', 'lost', 'rediscovered']).optional(),
  mapX: z.number(),
  mapY: z.number(),
  distance: z.string().nullable().optional(),
  reward: z.number().nullable().optional(),
  photoAssetPath: z.string().nullable().optional(),
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
});

// DB의 snake_case BLE 기기 값을 앱이 쓰는 camelCase 응답으로 변환한다.
function toBleDeviceDto(row: {
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
}) {
  return {
    id: row.id,
    name: row.name,
    iconKey: row.icon_key,
    status: row.status,
    location: row.location,
    lastSeen: row.last_seen,
    bleCode: row.ble_code,
    lastSignalAt: row.last_signal_at,
    bleStatus: row.ble_status,
    mapX: Number(row.map_x),
    mapY: Number(row.map_y),
    distance: row.distance,
    reward: row.reward,
    photoAssetPath: row.photo_asset_path,
    lastRssi: row.last_rssi == null ? null : Number(row.last_rssi),
    lastDetectedLatitude: row.last_detected_latitude == null ? null : Number(row.last_detected_latitude),
    lastDetectedLongitude: row.last_detected_longitude == null ? null : Number(row.last_detected_longitude),
    lastDetectedAccuracyMeters: row.last_detected_accuracy_meters == null ? null : Number(row.last_detected_accuracy_meters),
    focusedScanUntil: row.focused_scan_until,
    rediscoveredAt: row.rediscovered_at,
    batteryPercent: row.battery_percent == null ? null : Number(row.battery_percent),
    batteryCheckedAt: row.battery_checked_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const user = await requireRequestedUser(
      { email, loginId },
      'No user found for device registration.',
    );
    const devices = await listBleDevices(user.id);
    return NextResponse.json(devices.map(toBleDeviceDto));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load devices' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createDeviceSchema.parse(await request.json());
    const user = await requireRequestedUser(
      { email: body.email, loginId: body.loginId },
      'No user found for device registration.',
    );
    const created = await createBleDevice({
      userId: user.id,
      name: body.name,
      iconKey: body.iconKey,
      status: body.status,
      location: body.location,
      lastSeen: body.lastSeen,
      bleCode: body.bleCode,
      lastSignalAt: body.lastSignalAt,
      bleStatus: body.bleStatus,
      mapX: body.mapX,
      mapY: body.mapY,
      distance: body.distance,
      reward: body.reward,
      photoAssetPath: body.photoAssetPath,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create device' },
      { status: 400 },
    );
  }
}
