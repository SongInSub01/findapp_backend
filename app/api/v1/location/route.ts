// 현재 위치 스냅샷을 저장하거나 조회한다.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentLocation, upsertCurrentLocation } from '@/lib/repositories/current_location_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

const locationSchema = z.object({
  loginId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().nullable().optional(),
});

function toCurrentLocationDto(row: {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  updated_at: string;
}) {
  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyMeters: row.accuracy_meters == null ? null : Number(row.accuracy_meters),
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const loginId = request.nextUrl.searchParams.get('loginId') ?? undefined;
    const user = await requireRequestedUser(
      { email, loginId },
      'No user found for current location.',
    );
    const currentLocation = await getCurrentLocation(user.id);
    return NextResponse.json({
      currentLocation: currentLocation ? toCurrentLocationDto(currentLocation) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load current location' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = locationSchema.parse(await request.json());
    const user = await requireRequestedUser(
      { email: body.email, loginId: body.loginId },
      'No user found for current location.',
    );
    const currentLocation = await upsertCurrentLocation({
      userId: user.id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? null,
    });
    return NextResponse.json({
      currentLocation: currentLocation ? toCurrentLocationDto(currentLocation) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save current location' },
      { status: 400 },
    );
  }
}
