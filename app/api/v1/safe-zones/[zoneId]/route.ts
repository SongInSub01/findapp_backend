// 안전지대 수정 요청을 받아 safe_zones 테이블을 갱신한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveSafeZoneValues } from '@/lib/services/setting_update_service';

const updateSafeZoneSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  radiusMeters: z.number().int().positive(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ zoneId: string }> },
) {
  try {
    const body = updateSafeZoneSchema.parse(await request.json());
    const { zoneId } = await context.params;
    await saveSafeZoneValues({
      ...body,
      zoneId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update safe zone' },
      { status: 400 },
    );
  }
}
