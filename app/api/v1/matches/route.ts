// 현재 사용자 기준 추천 매칭 목록을 반환하는 API다.
import { NextRequest, NextResponse } from 'next/server';

import { listFinderMatches } from '@/lib/services/finder_app_service';

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const matches = await listFinderMatches({ loginId });
    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '매칭 목록을 불러오지 못했습니다.' },
      { status: 400 },
    );
  }
}
