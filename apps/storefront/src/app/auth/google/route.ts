import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
    const redirectUrl = new URL('/api/auth/google', request.url);
    const next = request.nextUrl.searchParams.get('next');
    if (next) {
        redirectUrl.searchParams.set('next', next);
    }
    return NextResponse.redirect(redirectUrl);
}
