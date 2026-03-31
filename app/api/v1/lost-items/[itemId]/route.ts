// 단일 분실물의 상세 조회, 수정, 삭제를 처리하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteFinderLostItem,
  getFinderListingDetail,
  updateFinderLostItem,
} from '@/lib/services/finder_app_service';

const lostItemUpdateSchema = z.object({
  loginId: z.string().min(1, '로그인 아이디가 필요합니다.'),
  title: z.string().min(1, '분실물 이름을 입력해 주세요.'),
  category: z.string().min(1, '카테고리를 선택해 주세요.'),
  color: z.string().min(1, '색상을 입력해 주세요.'),
  location: z.string().min(1, '분실 위치를 입력해 주세요.'),
  happenedAt: z.string().min(1, '분실 시간을 입력해 주세요.'),
  reward: z.number().int().min(0).default(0),
  listingStatus: z.enum(['open', 'matched', 'resolved', 'archived']).default('open'),
  description: z.string().min(1, '설명을 입력해 주세요.'),
  featureNotes: z.string().min(1, '특징을 입력해 주세요.'),
  contactNote: z.string().min(1, '연락 메모를 입력해 주세요.'),
  images: z.array(z.object({
    imageUrl: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    isPrimary: z.boolean(),
  })).default([]),
});

const deleteSchema = z.object({
  loginId: z.string().min(1, '로그인 아이디가 필요합니다.'),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const item = await getFinderListingDetail({
      loginId,
      itemType: 'lost',
      itemId,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '분실물 상세를 불러오지 못했습니다.' },
      { status: 404 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params;
    const payload = lostItemUpdateSchema.parse(await request.json());
    const item = await updateFinderLostItem({ ...payload, itemId });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '분실물 수정에 실패했습니다.' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params;
    const query = deleteSchema.parse({
      loginId: request.nextUrl.searchParams.get('loginId'),
    });
    await deleteFinderLostItem({ loginId: query.loginId, itemId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '분실물 삭제에 실패했습니다.' },
      { status: 400 },
    );
  }
}
