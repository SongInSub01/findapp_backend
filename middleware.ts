import { NextRequest, NextResponse } from 'next/server';

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;

  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return origin;
  if (origin === 'http://158.247.209.121:3000') return origin;

  return null;
}

function applyCorsHeaders(response: NextResponse, allowedOrigin: string | null) {
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const allowedOrigin = resolveAllowedOrigin(origin);

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, allowedOrigin);
    return response;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response, allowedOrigin);
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
