// 설정 저장 요청을 알림 설정과 안전지대 테이블에 반영한다.
import {
  createSafeZone,
  updateSafeZone,
  upsertAlertSettings,
} from '@/lib/repositories/setting_data';
import { createNotification } from '@/lib/repositories/activity_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';
import { nowLabel } from '@/lib/utils/time_label';

export async function saveAlertSettingValues(input: {
  loginId?: string;
  email?: string;
  distanceMeters: number;
  disconnectMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoApprovePhotos: boolean;
  keepPhotoPrivateByDefault: boolean;
}) {
  const user = await requireRequestedUser(input, 'No user found for alert settings.');
  await upsertAlertSettings({
    userId: user.id,
    distanceMeters: input.distanceMeters,
    disconnectMinutes: input.disconnectMinutes,
    vibrationEnabled: input.vibrationEnabled,
    soundEnabled: input.soundEnabled,
    autoApprovePhotos: input.autoApprovePhotos,
    keepPhotoPrivateByDefault: input.keepPhotoPrivateByDefault,
  });
  await createNotification({
    userId: user.id,
    title: '설정 저장 완료',
    body: '거리, 시간, 사진 보호 설정이 서버에 저장되었습니다.',
    timeLabel: nowLabel(),
    type: 'info',
  });
}

export async function saveSafeZoneValues(input: {
  loginId?: string;
  email?: string;
  zoneId?: string;
  name: string;
  address: string;
  radiusMeters: number;
}) {
  const user = await requireRequestedUser(input, 'No user found for safe zone update.');

  if (input.zoneId) {
    const updated = await updateSafeZone({
      userId: user.id,
      zoneId: input.zoneId,
      name: input.name,
      address: input.address,
      radiusMeters: input.radiusMeters,
    });
    if (!updated) {
      throw new Error('Failed to update safe zone.');
    }
  } else {
    await createSafeZone({
      userId: user.id,
      name: input.name,
      address: input.address,
      radiusMeters: input.radiusMeters,
    });
  }

  await createNotification({
    userId: user.id,
    title: '안전지대 저장 완료',
    body: `${input.name} 안전지대가 서버에 반영되었습니다.`,
    timeLabel: nowLabel(),
    type: 'info',
  });
}
