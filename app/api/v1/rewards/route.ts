// 리워드 포인트, 퀘스트, 상점, 등급 정보를 조회하는 API다.
import { NextRequest, NextResponse } from 'next/server';

import { loadRewardStatus } from '@/lib/services/reward_service';

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const rewardStatus = await loadRewardStatus({ loginId, email });
    return NextResponse.json({ rewardStatus });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '리워드를 불러오지 못했습니다.' },
      { status: 400 },
    );
  }
}
