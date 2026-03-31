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

    const status = result.body.success ? 200 : result.body.verificationRequired ? 403 : 401;
    const response = appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    console.info(
        `[auth:login] route responseSent status=${status} forwardedSetCookieCount=${getSetCookieCount(response.headers)}`,
    );
    return response;
}
