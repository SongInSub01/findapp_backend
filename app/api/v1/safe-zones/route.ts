// 안전지대를 새로 등록하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveSafeZoneValues } from '@/lib/services/setting_update_service';

// 안전지대 등록 요청에서 주소와 좌표, 반경 값을 검증한다.
const createSafeZoneSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  radiusMeters: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSafeZoneSchema.parse(await request.json());
    await saveSafeZoneValues(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create safe zone' },
      { status: 400 },
    );
  }
}
