// Connects the latest frontend reward claim path to the existing reward service.
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
      { message: error instanceof Error ? error.message : 'Failed to claim reward.' },
      { status: 400 },
    );
  }
}