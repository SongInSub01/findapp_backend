// 로그인 요청을 받아 비밀번호를 검증하고 현재 사용자 정보를 돌려준다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { loginUser } from '@/lib/services/auth_service';

const loginRequestSchema = z.object({
  loginId: z.string().min(1, '로그인 아이디를 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = loginRequestSchema.parse(await request.json());
    const user = await loginUser(payload);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '로그인에 실패했습니다.' },
      { status: 400 },
    );
  }
}
