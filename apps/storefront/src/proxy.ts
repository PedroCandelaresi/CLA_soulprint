import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    // The authoritative auth check stays in the protected layout, where we can validate the
    // real Vendure session server-side. Proxy only preserves the exact destination so the
    // login redirect can round-trip cleanly without duplicating auth logic or guessing cookie names.
    requestHeaders.set(
        'x-storefront-path',
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/mi-cuenta/:path*'],
};
