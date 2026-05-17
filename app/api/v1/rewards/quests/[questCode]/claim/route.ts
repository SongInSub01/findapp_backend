// 완료된 리워드 퀘스트를 수령하고 포인트를 적립하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { claimRewardQuestForUser } from '@/lib/services/reward_service';

const claimQuestSchema = z.object({
  loginId: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ questCode: string }> },
) {
  try {
    const body = claimQuestSchema.parse(await request.json());
    const { questCode } = await context.params;
    const rewardStatus = await claimRewardQuestForUser({
      ...body,
      questCode,
    });
    return NextResponse.json({ rewardStatus });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '리워드를 수령하지 못했습니다.' },
      { status: 400 },
    );
  }
}
