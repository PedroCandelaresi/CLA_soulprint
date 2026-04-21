import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import {
    getVendureSessionTokenFromCookieHeader,
    stripVendureSessionTokenFromCookieHeader,
} from '@/lib/auth/storefrontVendureSession';
import {
    applyRateLimitHeaders,
    consumeShopProxyRateLimit,
    getClientIpAddress,
    type RateLimitResult,
} from '@/lib/security/shopProxy';
import { getServerVendureRestBaseUrl } from '@/lib/vendure/server-config';

export function buildPersonalizationProxyError(
    message: string,
    status: number,
    rateLimitResult?: RateLimitResult | null,
): NextResponse {
    const response = NextResponse.json({ success: false, error: message }, { status });
    response.headers.set('cache-control', 'no-store');
    response.headers.set('vary', 'origin');

    if (rateLimitResult) {
        applyRateLimitHeaders(response, rateLimitResult);
    }

    return response;
}

export function consumePersonalizationRateLimit(request: NextRequest): RateLimitResult {
    return consumeShopProxyRateLimit(getClientIpAddress(request), 'general');
}

export function getPersonalizationUpstreamBaseUrl(): string {
    return `${getServerVendureRestBaseUrl()}/logistics/personalization`;
}

export function buildPersonalizationForwardHeaders(request: NextRequest): HeadersInit {
    const incomingCookieHeader = request.headers.get('cookie');
    const vendureSessionToken = getVendureSessionTokenFromCookieHeader(incomingCookieHeader);
    const forwardedCookieHeader = stripVendureSessionTokenFromCookieHeader(incomingCookieHeader);

    return {
        accept: 'application/json',
        'x-forwarded-proto': request.headers.get('x-forwarded-proto') ?? 'https',
        ...(forwardedCookieHeader ? { cookie: forwardedCookieHeader } : {}),
        ...(vendureSessionToken ? { authorization: `Bearer ${vendureSessionToken}` } : {}),
    };
}

