// 안심 구역, 알림 설정, 알림함, 신고 내역을 묶어 내려주는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listNotifications, listReports } from '@/lib/repositories/activity_data';
import { getAlertSettings, listSafeZones } from '@/lib/repositories/setting_data';
import { saveAlertSettingValues } from '@/lib/services/setting_update_service';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const updateAlertSettingsSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  distanceMeters: z.number().int().positive(),
  disconnectMinutes: z.number().int().positive(),
  vibrationEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  autoApprovePhotos: z.boolean(),
  keepPhotoPrivateByDefault: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const user = await requireRequestedUser(
      { email, loginId },
      'No user found for settings.',
    );
    const [safeZones, alertSettings, notifications, reports] = await Promise.all([
      listSafeZones(user.id),
      getAlertSettings(user.id),
      listNotifications(user.id),
      listReports(),
    ]);
    return NextResponse.json({
      safeZones,
      alertSettings,
      notifications,
      reports,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load settings' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = updateAlertSettingsSchema.parse(await request.json());
    await saveAlertSettingValues(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 400 },
    );
  }
}
