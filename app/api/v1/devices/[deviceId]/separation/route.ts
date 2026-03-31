import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getBleDeviceByIdAndUserId,
  updateBleDeviceTrackingState,
} from '@/lib/repositories/device_data';
import {
  createNotification,
  findRecentAlertByUserId,
} from '@/lib/repositories/activity_data';
import { getAlertSettings } from '@/lib/repositories/setting_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';
import { formatRelativeDateLabel } from '@/lib/utils/time_label';

const separationSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  detectedAt: z.string().min(1),
  location: z.string().min(1),
  mapX: z.number(),
  mapY: z.number(),
  distance: z.string().nullable().optional(),
  rssi: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await context.params;
    const body = separationSchema.parse(await request.json());

    const user = await requireRequestedUser(
      { email: body.email, loginId: body.loginId },
      'BLE 이탈 이벤트 사용자를 찾을 수 없습니다.',
    );

    const device = await getBleDeviceByIdAndUserId(deviceId, user.id);

    if (!device) {
      return NextResponse.json(
        { message: '해당 사용자의 BLE 기기를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const alertSettings = await getAlertSettings(user.id);
    const duplicateBlockMinutes = alertSettings?.disconnect_minutes ?? 5;

    const title = '물건이 멀어졌어요';
    const bodyText = `${device.name} 기기가 사용자와 멀어졌습니다. 주변을 확인해주세요.`;

    const recentAlert = await findRecentAlertByUserId({
      userId: user.id,
      title,
      bodyIncludes: device.name,
      minutes: duplicateBlockMinutes,
    });

    let notificationCreated = false;

    if (!recentAlert) {
      await createNotification({
        userId: user.id,
        title,
        body: bodyText,
        timeLabel: formatRelativeDateLabel(body.detectedAt),
        type: 'alert',
        isRead: false,
      });

      notificationCreated = true;
    }

    const updated = await updateBleDeviceTrackingState({
      deviceId: device.id,
      userId: user.id,
      status: 'lost',
      location: body.location,
      lastSeen: body.detectedAt,
      mapX: body.mapX,
      mapY: body.mapY,
      distance: body.distance ?? device.distance,
    });

    if (!updated) {
      return NextResponse.json(
        { message: 'BLE 기기 상태를 갱신하지 못했습니다.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      deviceId: device.id,
      status: 'lost',
      notificationCreated,
      duplicateBlocked: !notificationCreated,
      message: notificationCreated
        ? '이탈 알림이 생성되었습니다.'
        : '최근 중복 알림이 있어 새 알림은 생성하지 않았습니다.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'BLE separation event handling failed',
      },
      { status: 400 },
    );
  }
}