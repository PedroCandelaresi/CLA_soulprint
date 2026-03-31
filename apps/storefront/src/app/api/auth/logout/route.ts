import { NextRequest } from 'next/server';
import { appendVendureCookies, performLogout, toJsonResponse } from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const result = await performLogout({
        cookieHeader: request.headers.get('cookie') || undefined,
        forwardedProto: request.nextUrl.protocol.replace(':', '') || request.headers.get('x-forwarded-proto') || undefined,
        forwardedHost: request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host,
        forwardedFor: request.headers.get('x-forwarded-for') || undefined,
        origin: request.nextUrl.origin,
        referer: request.headers.get('referer') || request.nextUrl.origin,
    });
    return appendVendureCookies(result.headers, toJsonResponse(result.body, result.body.success ? 200 : 400));
}
