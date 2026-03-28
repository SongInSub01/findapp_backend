// 채팅방 목록을 읽고, 분실물 기준으로 채팅방을 새로 만들거나 다시 연다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listChatThreadsForUser } from '@/lib/repositories/chat_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';
import { openOrCreateChatThread } from '@/lib/services/chat_action_service';

const openChatSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  itemId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const user = await requireRequestedUser({ loginId, email }, '채팅 목록 사용자를 찾을 수 없습니다.');
    const threads = await listChatThreadsForUser(user.id);
    return NextResponse.json(threads);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load chat threads' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = openChatSchema.parse(await request.json());
    const threadId = await openOrCreateChatThread(body);
    return NextResponse.json({ threadId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to open chat thread' },
      { status: 400 },
    );
  }
}
