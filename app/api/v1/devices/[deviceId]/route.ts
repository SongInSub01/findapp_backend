// BLE 기기 메타데이터와 마지막 추적 상태를 수정한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteBleDevice, updateBleDevice } from '@/lib/repositories/device_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const updateDeviceSchema = z.object({
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await context.params;
    const body = updateDeviceSchema.parse(await request.json());
    const user = await requireRequestedUser(
      { email: body.email, loginId: body.loginId },
      'BLE 기기 수정 사용자를 찾을 수 없습니다.',
    );

    const updated = await updateBleDevice({
      deviceId,
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

    if (!updated) {
      throw new Error('수정할 BLE 기기를 찾지 못했습니다.');
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update device' },
      { status: 400 },
    );
  }
}

// BLE 기기 삭제 요청을 받아 본인 소유의 등록 정보만 제거한다.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await context.params;
    const { searchParams } = new URL(request.url);
    const user = await requireRequestedUser(
      {
        email: searchParams.get('email') ?? undefined,
        loginId: searchParams.get('loginId') ?? undefined,
      },
      'BLE 기기 삭제 사용자를 찾을 수 없습니다.',
    );

    const deleted = await deleteBleDevice({ deviceId, userId: user.id });
    if (!deleted) {
      throw new Error('삭제할 BLE 기기를 찾을 수 없습니다.');
    }

    return NextResponse.json({ ok: true, deviceId: deleted.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete device' },
      { status: 400 },
    );
  }
}
