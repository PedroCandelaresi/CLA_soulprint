import type { NextRequest, NextResponse } from 'next/server';
import { isProductionServerRuntime } from '@/lib/vendure/server-config';

type HeadersWithSetCookie = Headers & {
    getSetCookie?: () => string[];
};

type ParsedCookieAttribute = {
    key: string;
    lowerKey: string;
    value?: string;
};

type ParsedSetCookie = {
    name: string;
    value: string;
    attributes: ParsedCookieAttribute[];
};

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

export type ShopProxyRequestBody = {
    query: string;
    variables: Record<string, unknown>;
};

export type CsrfValidationResult = {
    allowed: boolean;
    reason?: string;
};

export type RateLimitResult = {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
    scope: 'general' | 'auth';
};

const RATE_LIMIT_BUCKETS = new Map<string, RateLimitBucket>();
const KNOWN_SET_COOKIE_ATTRIBUTES = new Set([
    'path',
    'domain',
    'expires',
    'max-age',
    'samesite',
    'secure',
    'httponly',
]);

function readNumericEnv(name: string, fallback: number): number {
    const rawValue = process.env[name];
    const parsedValue = rawValue ? Number(rawValue) : Number.NaN;
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function cleanupExpiredBuckets(now: number) {
    for (const [key, bucket] of RATE_LIMIT_BUCKETS.entries()) {
        if (bucket.resetAt <= now) {
            RATE_LIMIT_BUCKETS.delete(key);
        }
    }
}

function parseUrlOrigin(rawValue?: string | null): string | null {
    if (!rawValue) {
        return null;
    }

    try {
        return new URL(rawValue).origin;
    } catch {
        return null;
    }
}

function hasBrowserFetchMetadata(request: NextRequest): boolean {
    return Boolean(
        request.headers.get('sec-fetch-site') ||
            request.headers.get('sec-fetch-mode') ||
            request.headers.get('sec-fetch-dest'),
    );
}

function normalizeSameSite(value?: string): 'Lax' | 'Strict' {
    return value?.toLowerCase() === 'strict' ? 'Strict' : 'Lax';
}

function readCookieAttributeValue(
    attributes: ParsedCookieAttribute[],
    targetKey: string,
): string | undefined {
    const match = [...attributes]
        .reverse()
        .find((attribute) => attribute.lowerKey === targetKey.toLowerCase());

    return match?.value;
}

function hasCookieAttribute(attributes: ParsedCookieAttribute[], targetKey: string): boolean {
    return attributes.some((attribute) => attribute.lowerKey === targetKey.toLowerCase());
}

function parseSetCookieHeader(headerValue: string): ParsedSetCookie | null {
    const segments = headerValue
        .split(';')
        .map((segment) => segment.trim())
        .filter(Boolean);

    const [cookiePair, ...attributeSegments] = segments;
    if (!cookiePair) {
        return null;
    }

    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex <= 0) {
        return null;
    }

    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1);
    if (!name) {
        return null;
    }

    const attributes = attributeSegments.map<ParsedCookieAttribute>((segment) => {
        const attributeSeparatorIndex = segment.indexOf('=');

        if (attributeSeparatorIndex === -1) {
            return {
                key: segment,
                lowerKey: segment.toLowerCase(),
            };
        }

        const key = segment.slice(0, attributeSeparatorIndex).trim();
        const attributeValue = segment.slice(attributeSeparatorIndex + 1).trim();

        return {
            key,
            lowerKey: key.toLowerCase(),
            value: attributeValue,
        };
    });

    return {
        name,
        value,
        attributes,
    };
}

function looksLikeCookiePair(segment: string): boolean {
    const trimmedSegment = segment.trimStart();
    if (!trimmedSegment) {
        return false;
    }

    const equalsIndex = trimmedSegment.indexOf('=');
    if (equalsIndex <= 0) {
        return false;
    }

    const token = trimmedSegment.slice(0, equalsIndex).trim();
    return token.length > 0 && !token.includes(';') && !token.includes(',');
}

function splitCombinedSetCookieHeader(setCookieHeader: string): string[] {
    const cookies: string[] = [];
    let start = 0;
    let insideExpires = false;

    for (let index = 0; index < setCookieHeader.length; index += 1) {
        const currentChar = setCookieHeader[index];
        const rest = setCookieHeader.slice(index);

        if (!insideExpires && rest.slice(0, 8).toLowerCase() === 'expires=') {
            insideExpires = true;
            index += 7;
            continue;
        }

        if (insideExpires && currentChar === ';') {
            insideExpires = false;
            continue;
        }

        if (currentChar === ',' && !insideExpires) {
            const nextSegment = setCookieHeader.slice(index + 1);
            if (looksLikeCookiePair(nextSegment)) {
                const cookieValue = setCookieHeader.slice(start, index).trim();
                if (cookieValue) {
                    cookies.push(cookieValue);
                }
                start = index + 1;
            }
        }
    }

    const trailingCookie = setCookieHeader.slice(start).trim();
    if (trailingCookie) {
        cookies.push(trailingCookie);
    }

    return cookies;
}

function formatCookieAttribute(attribute: ParsedCookieAttribute): string {
    return typeof attribute.value === 'string'
        ? `${attribute.key}=${attribute.value}`
        : attribute.key;
}

function buildRateLimitKey(scope: RateLimitResult['scope'], identifier: string): string {
    return `${scope}:${identifier}`;
}

export function parseShopProxyRequestBody(rawBody: unknown): ShopProxyRequestBody | null {
    if (!rawBody || typeof rawBody !== 'object') {
        return null;
    }

    const body = rawBody as Record<string, unknown>;
    if (typeof body.query !== 'string' || !body.query.trim()) {
        return null;
    }

    return {
        query: body.query,
        variables:
            body.variables && typeof body.variables === 'object'
                ? (body.variables as Record<string, unknown>)
                : {},
    };
}

export function validateShopProxyCsrf(
    request: NextRequest,
    allowedOrigins: readonly string[],
): CsrfValidationResult {
    const originHeader = request.headers.get('origin');
    const refererHeader = request.headers.get('referer');
    const origin = parseUrlOrigin(originHeader);
    const refererOrigin = parseUrlOrigin(refererHeader);

    if (originHeader) {
        if (!origin || !allowedOrigins.includes(origin)) {
            return {
                allowed: false,
                reason: 'El origen de la solicitud no está autorizado.',
            };
        }

        return { allowed: true };
    }

    if (refererHeader) {
        if (!refererOrigin || !allowedOrigins.includes(refererOrigin)) {
            return {
                allowed: false,
                reason: 'El referer de la solicitud no está autorizado.',
            };
        }

        return { allowed: true };
    }

    if (hasBrowserFetchMetadata(request)) {
        return {
            allowed: false,
            reason: 'La solicitud del navegador no incluyó Origin ni Referer válidos.',
        };
    }

    // Internal server-to-server requests can omit Origin/Referer entirely.
    return { allowed: true };
}

export function getClientIpAddress(request: NextRequest): string {
    const directProxyIp =
        request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');

    if (directProxyIp) {
        return directProxyIp;
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const [firstIp] = forwardedFor
            .split(',')
            .map((candidate) => candidate.trim())
            .filter(Boolean);

        if (firstIp) {
            return firstIp;
        }
    }

    return 'unknown';
}

export function isSensitiveShopOperation(query: string): boolean {
    const normalizedQuery = query.toLowerCase();

    return [
        'login(',
        'registercustomeraccount(',
        'verifycustomeraccount(',
        'refreshcustomerverification(',
        'recovercustomeraccess(',
        'requestpasswordreset(',
        'resetpassword(',
    ].some((token) => normalizedQuery.includes(token));
}

export function consumeShopProxyRateLimit(
    identifier: string,
    scope: RateLimitResult['scope'],
): RateLimitResult {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const windowMs = readNumericEnv('SHOP_PROXY_RATE_LIMIT_WINDOW_MS', 60_000);
    const generalLimit = readNumericEnv('SHOP_PROXY_RATE_LIMIT_MAX', 180);
    const authLimit = readNumericEnv('SHOP_PROXY_AUTH_RATE_LIMIT_MAX', 12);
    const limit = scope === 'auth' ? authLimit : generalLimit;
    const key = buildRateLimitKey(scope, identifier);
    const bucket = RATE_LIMIT_BUCKETS.get(key);

    if (!bucket || bucket.resetAt <= now) {
        RATE_LIMIT_BUCKETS.set(key, {
            count: 1,
            resetAt: now + windowMs,
        });

        return {
            allowed: true,
            limit,
            remaining: Math.max(limit - 1, 0),
            resetAt: now + windowMs,
            retryAfterSeconds: Math.ceil(windowMs / 1000),
            scope,
        };
    }

    bucket.count += 1;
    const remaining = Math.max(limit - bucket.count, 0);

    return {
        allowed: bucket.count <= limit,
        limit,
        remaining,
        resetAt: bucket.resetAt,
        retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
        scope,
    };
}

export function applyRateLimitHeaders(
    response: NextResponse,
    rateLimitResult: RateLimitResult,
): void {
    response.headers.set('x-ratelimit-limit', String(rateLimitResult.limit));
    response.headers.set('x-ratelimit-remaining', String(rateLimitResult.remaining));
    response.headers.set('x-ratelimit-reset', String(Math.floor(rateLimitResult.resetAt / 1000)));
    response.headers.set('x-ratelimit-scope', rateLimitResult.scope);
}

export function getUpstreamSetCookies(headers: Headers): string[] {
    const typedHeaders = headers as HeadersWithSetCookie;

    if (typeof typedHeaders.getSetCookie === 'function') {
        return typedHeaders.getSetCookie();
    }

    const combinedHeader = headers.get('set-cookie');
    return combinedHeader ? splitCombinedSetCookieHeader(combinedHeader) : [];
}

export function hardenSetCookieHeader(setCookieHeader: string): string {
    const parsedCookie = parseSetCookieHeader(setCookieHeader);
    if (!parsedCookie) {
        return setCookieHeader;
    }

    const renderedAttributes: string[] = ['Path=/'];
    const domain = readCookieAttributeValue(parsedCookie.attributes, 'domain');
    const expires = readCookieAttributeValue(parsedCookie.attributes, 'expires');
    const maxAge = readCookieAttributeValue(parsedCookie.attributes, 'max-age');
    const sameSite = normalizeSameSite(readCookieAttributeValue(parsedCookie.attributes, 'samesite'));
    const shouldSetSecure =
        isProductionServerRuntime() || hasCookieAttribute(parsedCookie.attributes, 'secure');

    if (domain) {
        renderedAttributes.push(`Domain=${domain}`);
    }

    if (expires) {
        renderedAttributes.push(`Expires=${expires}`);
    }

    if (maxAge) {
        renderedAttributes.push(`Max-Age=${maxAge}`);
    }

    renderedAttributes.push(`SameSite=${sameSite}`);

    if (shouldSetSecure) {
        renderedAttributes.push('Secure');
    }

    renderedAttributes.push('HttpOnly');

    for (const attribute of parsedCookie.attributes) {
        if (KNOWN_SET_COOKIE_ATTRIBUTES.has(attribute.lowerKey)) {
            continue;
        }

        renderedAttributes.push(formatCookieAttribute(attribute));
    }

    return [`${parsedCookie.name}=${parsedCookie.value}`, ...renderedAttributes].join('; ');
}
