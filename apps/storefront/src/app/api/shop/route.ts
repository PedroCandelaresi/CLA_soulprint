import { NextRequest, NextResponse } from 'next/server';
import {
    buildClearedVendureSessionCookieOptions,
    buildVendureSessionCookieOptions,
    getVendureSessionCookieMaxAge,
    getVendureSessionTokenFromCookieHeader,
    STOREFRONT_VENDURE_SESSION_COOKIE,
    stripVendureSessionTokenFromCookieHeader,
} from '@/lib/auth/storefrontVendureSession';
import {
    applyRateLimitHeaders,
    consumeShopProxyRateLimit,
    getClientIpAddress,
    getUpstreamSetCookies,
    hardenSetCookieHeader,
    isSensitiveShopOperation,
    parseShopProxyRequestBody,
    validateShopProxyCsrf,
    type RateLimitResult,
} from '@/lib/security/shopProxy';
import {
    getAllowedStorefrontOrigins,
    getServerVendureApiUrl,
} from '@/lib/vendure/server-config';

function buildErrorResponse(
    message: string,
    status: number,
    rateLimitResult?: RateLimitResult | null,
): NextResponse {
    const response = NextResponse.json(
        { errors: [{ message }] },
        {
            status,
        },
    );

    response.headers.set('vary', 'origin');
    response.headers.set('cache-control', 'no-store');

    if (rateLimitResult) {
        applyRateLimitHeaders(response, rateLimitResult);

        if (!rateLimitResult.allowed) {
            response.headers.set('retry-after', String(rateLimitResult.retryAfterSeconds));
        }
    }

    return response;
}

export async function POST(request: NextRequest) {
    const clientIp = getClientIpAddress(request);
    const generalRateLimit = consumeShopProxyRateLimit(clientIp, 'general');

    if (!generalRateLimit.allowed) {
        return buildErrorResponse(
            'Detectamos demasiadas solicitudes desde esta conexión. Probá de nuevo en unos segundos.',
            429,
            generalRateLimit,
        );
    }

    let rawBody: unknown;

    try {
        rawBody = await request.json();
    } catch {
        return buildErrorResponse('Solicitud inválida.', 400, generalRateLimit);
    }

    const body = parseShopProxyRequestBody(rawBody);
    if (!body) {
        return buildErrorResponse('Solicitud inválida.', 400, generalRateLimit);
    }

    const allowedOrigins = getAllowedStorefrontOrigins(request.nextUrl.origin);
    const csrfValidation = validateShopProxyCsrf(request, allowedOrigins);
    if (!csrfValidation.allowed) {
        return buildErrorResponse(
            csrfValidation.reason || 'La solicitud fue bloqueada por la política CSRF.',
            403,
            generalRateLimit,
        );
    }

    const authRateLimit = isSensitiveShopOperation(body.query)
        ? consumeShopProxyRateLimit(clientIp, 'auth')
        : null;
    const activeRateLimit = authRateLimit ?? generalRateLimit;

    if (authRateLimit && !authRateLimit.allowed) {
        return buildErrorResponse(
            'Por seguridad limitamos temporalmente los intentos de acceso. Esperá un momento y volvé a intentar.',
            429,
            authRateLimit,
        );
    }

    let shopApiUrl: string;

    try {
        shopApiUrl = getServerVendureApiUrl();
    } catch (error) {
        console.error('Configuración inválida para el upstream de Vendure', error);
        return buildErrorResponse(
            'La tienda no está configurada correctamente en este entorno.',
            500,
            activeRateLimit,
        );
    }

    try {
        const incomingCookieHeader = request.headers.get('cookie');
        const vendureSessionToken = getVendureSessionTokenFromCookieHeader(incomingCookieHeader);
        const forwardedCookieHeader =
            stripVendureSessionTokenFromCookieHeader(incomingCookieHeader);

        const upstreamResponse = await fetch(shopApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Vendure uses this header to decide whether the session cookie should be marked Secure.
                'x-forwarded-proto': request.headers.get('x-forwarded-proto') ?? 'https',
                ...(forwardedCookieHeader ? { cookie: forwardedCookieHeader } : {}),
                ...(vendureSessionToken
                    ? { authorization: `Bearer ${vendureSessionToken}` }
                    : {}),
            },
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        const responseText = await upstreamResponse.text();
        const response = new NextResponse(responseText, {
            status: upstreamResponse.status,
            headers: {
                'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
            },
        });

        response.headers.set('vary', 'origin');
        response.headers.set('cache-control', 'no-store');
        applyRateLimitHeaders(response, activeRateLimit);

        for (const setCookieHeader of getUpstreamSetCookies(upstreamResponse.headers)) {
            response.headers.append('set-cookie', hardenSetCookieHeader(setCookieHeader));
        }

        if (upstreamResponse.headers.has('vendure-auth-token')) {
            const nextVendureSessionToken =
                upstreamResponse.headers.get('vendure-auth-token')?.trim() ?? '';
            const rememberMe = getVendureSessionCookieMaxAge(body.variables.rememberMe === true);

            if (nextVendureSessionToken) {
                response.cookies.set(
                    STOREFRONT_VENDURE_SESSION_COOKIE,
                    nextVendureSessionToken,
                    {
                        ...buildVendureSessionCookieOptions(body.variables.rememberMe === true),
                        ...(typeof rememberMe === 'number' ? { maxAge: rememberMe } : {}),
                    },
                );
            } else {
                response.cookies.set(
                    STOREFRONT_VENDURE_SESSION_COOKIE,
                    '',
                    buildClearedVendureSessionCookieOptions(),
                );
            }
        }

        return response;
    } catch (error) {
        console.error('No se pudo conectar el proxy /api/shop con Vendure', error);
        return buildErrorResponse(
            'No se pudo conectar con la API de la tienda.',
            502,
            activeRateLimit,
        );
    }
}
