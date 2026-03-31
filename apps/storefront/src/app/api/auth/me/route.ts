import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { fetchActiveCustomerWithHeaders } from '../utils';

export const dynamic = 'force-dynamic';

function getCookieNames(cookieHeader?: string | null): string[] {
    if (!cookieHeader) {
        return [];
    }

    return cookieHeader
        .split(';')
        .map((item) => item.trim().split('=')[0]?.trim())
        .filter((name): name is string => Boolean(name));
}

function getSetCookieCount(headers: Headers): number {
    const candidate = headers as Headers & { getSetCookie?: () => string[] };
    if (typeof candidate.getSetCookie === 'function') {
        return candidate.getSetCookie().length;
    }

    return headers.get('set-cookie') ? 1 : 0;
}

export async function GET(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie');
    console.info(
        `[auth:me] route requestReceived cookiePresent=${Boolean(cookieHeader)} cookieNames=${
            getCookieNames(cookieHeader).join(',') || '(none)'
        }`,
    );

    try {
        const result = await fetchActiveCustomerWithHeaders(cookieHeader || undefined);
        console.info(
            `[auth:me] route vendureCustomer=${result.customer?.id ?? 'null'} vendureSetCookieCount=${getSetCookieCount(result.headers)}`,
        );
        const response = NextResponse.json({
            success: true,
            customer: result.customer,
        });
        appendVendureSetCookieHeaders(result.headers, response.headers);
        console.info(
            `[auth:me] route responseSent success=true customer=${result.customer?.id ?? 'null'} forwardedSetCookieCount=${getSetCookieCount(response.headers)}`,
        );
        return response;
    } catch (error) {
        console.error('[auth:me] route failed', error);
        return NextResponse.json({
            success: true,
            customer: null,
        });
    }
}
