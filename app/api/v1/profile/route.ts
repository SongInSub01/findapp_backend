// 프로필 수정 요청을 받아 users 테이블에 반영한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveProfile } from '@/lib/services/profile_update_service';

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  loginId: z.string().min(1).optional(),
  userName: z.string().min(1),
  publicName: z.string().min(1),
  photoAssetPath: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  profileBio: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = updateProfileSchema.parse(await request.json());
    const user = await saveProfile(body);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 400 },
    );
  }
}
