import { NextResponse } from 'next/server';
import { isBlockedUsername } from './utils/contentModeration';

export function middleware(request) {
  let username;
  try {
    username = decodeURIComponent(request.nextUrl.pathname.split('/')[1] || '');
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
  if (isBlockedUsername(username)) {
    return new NextResponse('This page is unavailable.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
