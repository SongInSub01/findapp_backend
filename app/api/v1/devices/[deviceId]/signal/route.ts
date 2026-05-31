// BLE 신호 재확인 시점을 최신화하고, 필요하면 자동 분실 상태를 풀어 준다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { query } from '@/lib/db/query';
import { findLostItemBySourceDeviceId } from '@/lib/repositories/finder_listing_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const refreshSchema = z.object({
  loginId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  rssi: z.number().int().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().nonnegative().nullable().optional(),
  focusMinutes: z.number().int().min(1).max(30).optional(),
});

function resolveBleStatus(rssi?: number) {
  if (rssi == null) {
    return 'near' as const;
  }
  if (rssi <= -90) {
    return 'risk' as const;
  }
  if (rssi <= -75) {
    return 'far' as const;
  }
  return 'near' as const;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await context.params;
    const body = refreshSchema.parse(await request.json());
    const user = await requireRequestedUser(
      { email: body.email, loginId: body.loginId },
      'BLE 신호를 갱신할 사용자를 찾을 수 없습니다.',
    );

    const updatedAt = new Date().toISOString();
    const nextBleStatus = resolveBleStatus(body.rssi);
    const focusedScanUntil = body.focusMinutes == null
      ? null
      : new Date(Date.now() + body.focusMinutes * 60_000).toISOString();
    const deviceResult = await query<{
      id: string;
      name: string;
      icon_key: string;
      status: 'safe' | 'lost' | 'contact';
      location: string;
      ble_code: string;
      map_x: number;
      map_y: number;
      distance: string | null;
      reward: number | null;
      photo_asset_path: string | null;
    }>(
      `
      select id, name, icon_key, status, location, ble_code, map_x, map_y, distance,
               reward, photo_asset_path
        from ble_devices
        where id = $1
          and user_id = $2
        limit 1
      `,
      [deviceId, user.id],
    );
    const device = deviceResult.rows[0];
    if (!device) {
      throw new Error('수정할 BLE 기기를 찾지 못했습니다.');
    }

    const wasLost = device.status === 'lost';
    await query(
      `
        update ble_devices
        set status = 'safe',
            last_seen = '방금 전',
            last_signal_at = $3,
            ble_status = $4,
            last_rssi = coalesce($5, last_rssi),
            last_detected_latitude = coalesce($6, last_detected_latitude),
            last_detected_longitude = coalesce($7, last_detected_longitude),
            last_detected_accuracy_meters = coalesce($8, last_detected_accuracy_meters),
            focused_scan_until = coalesce($9, focused_scan_until),
            rediscovered_at = case when $10 then $3::timestamptz else rediscovered_at end
        where id = $1
          and user_id = $2
      `,
      [
        deviceId,
        user.id,
        updatedAt,
        wasLost ? 'rediscovered' : nextBleStatus,
        body.rssi ?? null,
        body.latitude ?? null,
        body.longitude ?? null,
        body.accuracyMeters ?? null,
        focusedScanUntil,
        wasLost,
      ],
    );

    const linkedLostItem = await findLostItemBySourceDeviceId(deviceId);
    if (linkedLostItem) {
      await query(
        `
          update lost_items
          set status = 'safe',
              listing_status = 'resolved',
              updated_at = now()
          where source_device_id = $1
        `,
        [deviceId],
      );
    }

    if (wasLost) {
      await query(
        `
          insert into notifications (user_id, title, body, time_label, type)
          values ($1, $2, $3, '방금 전', 'alert')
        `,
        [
          user.id,
          `${device.name}이(가) 다시 감지되었습니다`,
          body.latitude != null && body.longitude != null
            ? '재감지 위치가 지도에 반영되었습니다.'
            : 'BLE 신호가 다시 확인되었습니다.',
        ],
      );
    }

    return NextResponse.json({
      ok: true,
      lastSignalAt: updatedAt,
      bleStatus: wasLost ? 'rediscovered' : nextBleStatus,
      focusedScanUntil,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to refresh BLE signal' },
      { status: 400 },
    );
  }
}
