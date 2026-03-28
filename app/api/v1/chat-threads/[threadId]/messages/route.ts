// 채팅 메시지를 저장하고 마지막 메시지 요약을 갱신한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveChatMessage } from '@/lib/services/chat_action_service';

const sendMessageSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  text: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const body = sendMessageSchema.parse(await request.json());
    const { threadId } = await context.params;
    await saveChatMessage({
      ...body,
      threadId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 400 },
    );
  }
}
