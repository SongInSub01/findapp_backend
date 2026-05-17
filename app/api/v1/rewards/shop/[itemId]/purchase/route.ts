// 리워드 포인트로 상점 상품을 구매하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { purchaseRewardShopItemForUser } from '@/lib/services/reward_service';

const purchaseSchema = z.object({
  loginId: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const body = purchaseSchema.parse(await request.json());
    const { itemId } = await context.params;
    const rewardStatus = await purchaseRewardShopItemForUser({
      ...body,
      itemId,
    });
    return NextResponse.json({ rewardStatus });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '리워드 상품을 구매하지 못했습니다.' },
      { status: 400 },
    );
  }
}
