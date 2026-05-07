import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    if (request.headers.has('next-action')) {
        return new NextResponse(null, {
            status: 410,
            headers: {
                'cache-control': 'no-store',
            },
        });
    }

    if (request.nextUrl.pathname.startsWith('/mi-cuenta')) {
        // The authoritative auth check stays in the protected layout, where we can validate the
        // real Vendure session server-side. Proxy only preserves the exact destination so the
        // login redirect can round-trip cleanly without duplicating auth logic or guessing cookie names.
        requestHeaders.set(
            'x-storefront-path',
            `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)'],
};
