import 'server-only';

import { isProductionServerRuntime } from '@/lib/vendure/server-config';

export const STOREFRONT_VENDURE_SESSION_COOKIE = 'storefront_vendure_session';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

type ParsedCookiePair = {
    name: string;
    value: string;
};

function parseCookieHeader(cookieHeader?: string | null): ParsedCookiePair[] {
    if (!cookieHeader) {
        return [];
    }

    return cookieHeader
        .split(';')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
            const separatorIndex = segment.indexOf('=');

            if (separatorIndex === -1) {
                return {
                    name: segment,
                    value: '',
                };
            }

            return {
                name: segment.slice(0, separatorIndex).trim(),
                value: segment.slice(separatorIndex + 1),
            };
        })
        .filter((cookie) => Boolean(cookie.name));
}

function serializeCookieHeader(pairs: ParsedCookiePair[]): string | null {
    if (!pairs.length) {
        return null;
    }

    return pairs.map((pair) => `${pair.name}=${pair.value}`).join('; ');
}

export function getVendureSessionTokenFromCookieHeader(cookieHeader?: string | null): string | null {
    const tokenCookie = parseCookieHeader(cookieHeader).find(
        (cookie) => cookie.name === STOREFRONT_VENDURE_SESSION_COOKIE,
    );

    if (!tokenCookie?.value) {
        return null;
    }

    try {
        return decodeURIComponent(tokenCookie.value);
    } catch {
        return tokenCookie.value;
    }
}

export function stripVendureSessionTokenFromCookieHeader(
    cookieHeader?: string | null,
): string | null {
    const remainingCookies = parseCookieHeader(cookieHeader).filter(
        (cookie) => cookie.name !== STOREFRONT_VENDURE_SESSION_COOKIE,
    );

    return serializeCookieHeader(remainingCookies);
}

export function getVendureSessionCookieMaxAge(rememberMe: boolean): number | undefined {
    return rememberMe ? ONE_YEAR_IN_SECONDS : undefined;
}

export function buildVendureSessionCookieOptions(rememberMe: boolean) {
    return {
        httpOnly: true,
        secure: isProductionServerRuntime(),
        sameSite: 'lax' as const,
        path: '/',
        ...(rememberMe ? { maxAge: ONE_YEAR_IN_SECONDS } : {}),
    };
}

export function buildClearedVendureSessionCookieOptions() {
    return {
        httpOnly: true,
        secure: isProductionServerRuntime(),
        sameSite: 'lax' as const,
        path: '/',
        expires: new Date(0),
        maxAge: 0,
    };
}
