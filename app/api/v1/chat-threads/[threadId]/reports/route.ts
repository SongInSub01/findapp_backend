// 채팅 신고를 저장하고 시스템 메시지와 알림을 함께 남긴다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveChatReport } from '@/lib/services/chat_action_service';

const reportSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  reason: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const body = reportSchema.parse(await request.json());
    const { threadId } = await context.params;
    await saveChatReport({
      ...body,
      threadId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to submit report' },
      { status: 400 },
    );
  }
}
