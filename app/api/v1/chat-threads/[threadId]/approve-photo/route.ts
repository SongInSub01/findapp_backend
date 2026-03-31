// 사진 승인 완료 상태를 저장한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { approvePhotoForThread } from '@/lib/services/chat_action_service';

const approvePhotoSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const body = approvePhotoSchema.parse(await request.json());
    const { threadId } = await context.params;
    await approvePhotoForThread({
      ...body,
      threadId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to approve photo' },
      { status: 400 },
    );
  }
}
