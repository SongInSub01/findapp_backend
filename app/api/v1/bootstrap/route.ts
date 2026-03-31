// 앱 첫 진입에 필요한 전체 화면 데이터를 사용자 기준으로 묶어서 반환한다.
import { NextRequest, NextResponse } from 'next/server';

import { getFinderBootstrap } from '@/lib/services/finder_app_service';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const payload = await getFinderBootstrap({ email, loginId });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to load bootstrap payload',
      },
      { status: 500 },
    );
  }
}
