// 알림 단건 삭제를 처리하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteNotification } from '@/lib/repositories/activity_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const schema = z.object({
  loginId: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  try {
    const body = schema.parse(await request.json());
    const { notificationId } = await context.params;
    const user = await requireRequestedUser(body, '사용자를 찾을 수 없습니다.');
    await deleteNotification({ notificationId, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '알림 삭제에 실패했습니다.' },
      { status: 400 },
    );
  }
}
