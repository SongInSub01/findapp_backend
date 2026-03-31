// 분실물 목록 조회와 신규 등록을 처리하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createFinderLostItem,
  searchFinderListings,
} from '@/lib/services/finder_app_service';

const lostItemSchema = z.object({
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

export async function GET(request: NextRequest) {
  try {
    const queryText = request.nextUrl.searchParams.get('q') ?? undefined;
    const category = request.nextUrl.searchParams.get('category') ?? undefined;
    const color = request.nextUrl.searchParams.get('color') ?? undefined;
    const location = request.nextUrl.searchParams.get('location') ?? undefined;
    const listingStatus = request.nextUrl.searchParams.get('listingStatus') ?? undefined;
    const dateFrom = request.nextUrl.searchParams.get('dateFrom') ?? undefined;
    const dateTo = request.nextUrl.searchParams.get('dateTo') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;

    const items = await searchFinderListings({
      loginId,
      itemType: 'lost',
      queryText,
      category,
      color,
      location,
      listingStatus,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '분실물 목록을 불러오지 못했습니다.' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = lostItemSchema.parse(await request.json());
    const item = await createFinderLostItem(payload);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '분실물 등록에 실패했습니다.' },
      { status: 400 },
    );
  }
}
