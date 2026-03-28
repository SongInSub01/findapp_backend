// 사진 열람 요청을 저장하고 승인 대기 또는 자동 승인 상태를 반영한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requestPhotoForThread } from '@/lib/services/chat_action_service';

const requestPhotoSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const body = requestPhotoSchema.parse(await request.json());
    const { threadId } = await context.params;
    await requestPhotoForThread({
      ...body,
      threadId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to request photo approval' },
      { status: 400 },
    );
  }
}
