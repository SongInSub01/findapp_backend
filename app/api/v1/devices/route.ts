// BLE 기기 목록 조회와 새 기기 등록을 담당하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createBleDevice, listBleDevices } from '@/lib/repositories/device_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const createDeviceSchema = z.object({
  name: z.string().min(1),
  iconKey: z.string().min(1),
  status: z.enum(['safe', 'lost', 'contact']),
  location: z.string().min(1),
  lastSeen: z.string().min(1),
  bleCode: z.string().min(1),
  mapX: z.number(),
  mapY: z.number(),
  distance: z.string().nullable().optional(),
  reward: z.number().nullable().optional(),
  photoAssetPath: z.string().nullable().optional(),
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const user = await requireRequestedUser(
      { email, loginId },
      'No user found for device registration.',
    );
    const devices = await listBleDevices(user.id);
    return NextResponse.json(devices);
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
