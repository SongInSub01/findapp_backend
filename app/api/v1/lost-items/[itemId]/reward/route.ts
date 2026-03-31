// 사례금 수정 요청을 받아 분실물과 채팅 요약을 함께 갱신한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveFinderLostItemReward } from '@/lib/services/finder_app_service';

const rewardUpdateSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  reward: z.number().int().nonnegative(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const body = rewardUpdateSchema.parse(await request.json());
    const { itemId } = await context.params;
    await saveFinderLostItemReward({
      ...body,
      itemId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update reward' },
      { status: 400 },
    );
  }
}
