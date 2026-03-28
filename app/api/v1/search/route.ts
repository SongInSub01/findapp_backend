// 분실물과 습득물을 공통 조건으로 검색하는 API다.
import { NextRequest, NextResponse } from 'next/server';

import { searchFinderListings } from '@/lib/services/finder_app_service';

export async function GET(request: NextRequest) {
  try {
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const itemType = (request.nextUrl.searchParams.get('itemType') ?? 'all') as
      | 'lost'
      | 'found'
      | 'all';
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
