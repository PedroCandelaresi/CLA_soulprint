import { NextRequest } from 'next/server';
import { appendVendureCookies, buildAuthProxyContext, performLogin, toJsonResponse } from '../utils';

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

function maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');
    if (!domain) {
        return email;
    }

    const safeLocal = localPart.length <= 2
        ? `${localPart[0] || '*'}*`
        : `${localPart.slice(0, 2)}***`;

    return `${safeLocal}@${domain}`;
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

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const rememberMe = body?.rememberMe !== false;
    const incomingCookieHeader = request.headers.get('cookie');

    console.info(
        `[auth:login] route requestReceived email=${maskEmail(email)} rememberMe=${rememberMe} cookiePresent=${Boolean(incomingCookieHeader)} cookieNames=${
            getCookieNames(incomingCookieHeader).join(',') || '(none)'
        }`,
    );

    if (!email || !password) {
        console.warn('[auth:login] route rejected request with missing credentials');
        return toJsonResponse({
            success: false,
            error: 'Email y contraseña son obligatorios.',
        }, 400);
    }

    const result = await performLogin({
        email,
        password,
        rememberMe,
        ...buildAuthProxyContext(request),
    });

    console.info(
        `[auth:login] route performLogin success=${result.body.success} verificationRequired=${Boolean(result.body.verificationRequired)} vendureSetCookieCount=${getSetCookieCount(result.headers)}`,
    );
    console.info(
        `[auth:login] route vendureSetCookie=${JSON.stringify(getSetCookieValues(result.headers))}`,
    );

    const status = result.body.success ? 200 : result.body.verificationRequired ? 403 : 401;
    const response = appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    console.info(
        `[auth:login] route responseSent status=${status} forwardedSetCookieCount=${getSetCookieCount(response.headers)}`,
    );
    console.info(
        `[auth:login] route forwardedSetCookie=${JSON.stringify(getSetCookieValues(response.headers))}`,
    );
    return response;
}
