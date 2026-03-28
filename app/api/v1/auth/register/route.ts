// 회원가입 요청을 받아 사용자를 생성하고 기본 설정을 함께 만든다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { registerUser } from '@/lib/services/auth_service';

const registerRequestSchema = z.object({
  userName: z.string().min(1, '이름을 입력해 주세요.'),
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  loginId: z.string().min(1).optional(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = registerRequestSchema.parse(await request.json());
    const user = await registerUser(payload);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '회원가입에 실패했습니다.' },
      { status: 400 },
    );
  }
}
