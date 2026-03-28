// 서버와 데이터베이스가 함께 살아 있는지 확인하는 간단한 진단 API다.
import { NextResponse } from 'next/server';

import { getHealthStatus } from '@/lib/services/health_check_service';

export async function GET() {
  try {
    const health = await getHealthStatus();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown health check error',
      },
      { status: 500 },
    );
  }
}
