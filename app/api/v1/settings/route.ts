// 안심 구역, 알림 설정, 알림함, 신고 내역을 묶어 내려주는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listNotifications, listReports } from '@/lib/repositories/activity_data';
import { getAlertSettings, listSafeZones } from '@/lib/repositories/setting_data';
import { saveAlertSettingValues } from '@/lib/services/setting_update_service';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

// 알림 거리, 시간, 사진 공개 정책, 지도 테마 설정 값을 검증한다.
const updateAlertSettingsSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  distanceMeters: z.number().int().positive(),
  disconnectMinutes: z.number().int().positive(),
  vibrationEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  autoApprovePhotos: z.boolean(),
  keepPhotoPrivateByDefault: z.boolean(),
  defaultReward: z.number().int().positive(),
  mapTheme: z.enum(['dark', 'light']),
});

// DB의 안전지대 좌표와 반경을 앱에서 바로 쓰는 형태로 변환한다.
function toSafeZoneDto(row: {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
}) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    radiusMeters: row.radius_meters,
  };
}

// 저장된 알림 설정이 없으면 앱 기본값을 내려준다.
function toAlertSettingsDto(row: {
  distance_meters: number;
  disconnect_minutes: number;
  vibration_enabled: boolean;
  sound_enabled: boolean;
  auto_approve_photos: boolean;
  keep_photo_private_by_default: boolean;
  default_reward: number;
  map_theme: 'dark' | 'light';
} | null) {
  return {
    distanceMeters: row?.distance_meters ?? 10,
    disconnectMinutes: row?.disconnect_minutes ?? 5,
    vibrationEnabled: row?.vibration_enabled ?? true,
    soundEnabled: row?.sound_enabled ?? true,
    autoApprovePhotos: row?.auto_approve_photos ?? false,
    keepPhotoPrivateByDefault: row?.keep_photo_private_by_default ?? true,
    defaultReward: row?.default_reward ?? 30000,
    mapTheme: row?.map_theme ?? 'dark',
  };
}

function toNotificationDto(row: {
  id: string;
  title: string;
  body: string;
  time_label: string;
  type: 'alert' | 'approval' | 'info' | 'report';
  is_read: boolean;
}) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    timeLabel: row.time_label,
    type: row.type,
    isRead: row.is_read,
  };
}

function toReportDto(row: {
  id: string;
  target_title: string;
  reason: string;
  created_at_label: string;
  status_label: string;
}) {
  return {
    id: row.id,
    targetTitle: row.target_title,
    reason: row.reason,
    createdAtLabel: row.created_at_label,
    statusLabel: row.status_label,
  };
}

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
      safeZones: safeZones.map(toSafeZoneDto),
      alertSettings: toAlertSettingsDto(alertSettings),
      notifications: notifications.map(toNotificationDto),
      reports: reports.map(toReportDto),
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
