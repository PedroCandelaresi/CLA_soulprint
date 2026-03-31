import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { buildAuthProxyContext, performGetActiveCustomer, resolveAuthErrorResponse } from '../utils';

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

function splitCombinedSetCookieHeader(value: string): string[] {
    const cookies: string[] = [];
    let current = '';
    let inExpiresAttribute = false;

    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        current += char;

        const lowerCurrent = current.toLowerCase();
        if (!inExpiresAttribute && lowerCurrent.endsWith('expires=')) {
            inExpiresAttribute = true;
            continue;
        }

        if (inExpiresAttribute && char === ';') {
            inExpiresAttribute = false;
            continue;
        }

        if (!inExpiresAttribute && char === ',' && index < value.length - 1) {
            current = current.slice(0, -1).trim();
            if (current) {
                cookies.push(current);
            }
            current = '';
        }
    }

    const trailing = current.trim();
    if (trailing) {
        cookies.push(trailing);
    }

    return cookies;
}

function getSetCookieValues(headers: Headers): string[] {
    const candidate = headers as Headers & { getSetCookie?: () => string[] };
    if (typeof candidate.getSetCookie === 'function') {
        return candidate.getSetCookie();
    }

    const combinedHeader = headers.get('set-cookie');
    return combinedHeader ? splitCombinedSetCookieHeader(combinedHeader) : [];
}

export async function GET(request: NextRequest) {
    const proxyContext = buildAuthProxyContext(request);
    const cookieHeader = proxyContext.cookieHeader;
    console.info(
        `[auth:me] route requestReceived cookiePresent=${Boolean(cookieHeader)} cookieNames=${
            getCookieNames(cookieHeader).join(',') || '(none)'
        } forwardedProto=${proxyContext.forwardedProto || '(none)'} forwardedHost=${proxyContext.forwardedHost || '(none)'}`,
    );
    console.info(
        `[auth:me] route incomingCookieHeader=${cookieHeader || '(none)'}`,
    );
    console.info(
        `[auth:me] route forwardingHeaders=${JSON.stringify({
            cookie: proxyContext.cookieHeader || null,
            'x-forwarded-proto': proxyContext.forwardedProto || null,
            'x-forwarded-host': proxyContext.forwardedHost || null,
            'x-forwarded-for': proxyContext.forwardedFor || null,
            origin: proxyContext.origin || null,
            referer: proxyContext.referer || null,
        })}`,
    );

    try {
        const result = await performGetActiveCustomer(proxyContext);
        console.info(
            `[auth:me] route vendureCustomer=${result.customer?.id ?? 'null'} vendureSetCookieCount=${getSetCookieCount(result.headers)}`,
        );
        console.info(
            `[auth:me] route vendureSetCookie=${JSON.stringify(getSetCookieValues(result.headers))}`,
        );
        const response = NextResponse.json({
            success: true,
            customer: result.customer,
        });
        appendVendureSetCookieHeaders(result.headers, response.headers);
        console.info(
            `[auth:me] route responseSent success=true customer=${result.customer?.id ?? 'null'} forwardedSetCookieCount=${getSetCookieCount(response.headers)}`,
        );
        console.info(
            `[auth:me] route forwardedSetCookie=${JSON.stringify(getSetCookieValues(response.headers))}`,
        );
        return response;
    } catch (error) {
        console.error('[auth:me] route failed', error);
        return resolveAuthErrorResponse(error, 'No se pudo validar la sesión.', 502);
    }
}
