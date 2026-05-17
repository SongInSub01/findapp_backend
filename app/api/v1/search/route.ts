// 분실물과 습득물을 공통 조건으로 검색하는 API다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { searchFinderListings } from '@/lib/services/finder_app_service';

// 검색 대상이 분실물, 습득물, 전체 중 하나인지 검증한다.
const itemTypeSchema = z.enum(['lost', 'found', 'all']).default('all');

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const itemType = itemTypeSchema.parse(
      request.nextUrl.searchParams.get('itemType') ?? 'all',
    );
    const queryText = request.nextUrl.searchParams.get('q') ?? undefined;
    const category = request.nextUrl.searchParams.get('category') ?? undefined;
    const color = request.nextUrl.searchParams.get('color') ?? undefined;
    const location = request.nextUrl.searchParams.get('location') ?? undefined;
    const listingStatus = request.nextUrl.searchParams.get('listingStatus') ?? undefined;
    const dateFrom = request.nextUrl.searchParams.get('dateFrom') ?? undefined;
    const dateTo = request.nextUrl.searchParams.get('dateTo') ?? undefined;

    const items = await searchFinderListings({
      loginId,
      itemType,
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
      { message: error instanceof Error ? error.message : '검색에 실패했습니다.' },
      { status: 400 },
    );
  }
}
