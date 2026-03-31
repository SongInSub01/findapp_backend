// 사용자 문의 목록 조회와 신규 문의 등록을 처리하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getFinderBootstrap, submitFinderInquiry } from '@/lib/services/finder_app_service';

const inquirySchema = z.object({
  loginId: z.string().min(1, '로그인 아이디가 필요합니다.'),
  category: z.enum(['report', 'support', 'moderation']),
  title: z.string().min(1, '제목을 입력해 주세요.'),
  body: z.string().min(1, '내용을 입력해 주세요.'),
  relatedItemType: z.enum(['lost', 'found']).optional(),
  relatedItemId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const payload = await getFinderBootstrap({ loginId });
    return NextResponse.json({ inquiries: payload.inquiries });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '문의 목록을 불러오지 못했습니다.' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = inquirySchema.parse(await request.json());
    const inquiryId = await submitFinderInquiry(payload);
    return NextResponse.json({ inquiryId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '문의 등록에 실패했습니다.' },
      { status: 400 },
    );
  }
}
