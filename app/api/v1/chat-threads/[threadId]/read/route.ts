// 채팅방 읽음 처리를 서버에 저장한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { markThreadAsRead } from '@/lib/services/chat_action_service';

const markReadSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const body = markReadSchema.parse(await request.json());
    const { threadId } = await context.params;
    await markThreadAsRead({
      ...body,
      threadId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save read state' },
      { status: 400 },
    );
  }
}
