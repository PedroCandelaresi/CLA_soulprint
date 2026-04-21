import { NextRequest, NextResponse } from 'next/server';
import {
    buildPersonalizationForwardHeaders,
    buildPersonalizationProxyError,
    consumePersonalizationRateLimit,
    getPersonalizationUpstreamBaseUrl,
} from '@/lib/personalization/server-proxy';

type RouteContext = {
    params: Promise<{ orderCode: string }> | { orderCode: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
    const rateLimit = consumePersonalizationRateLimit(request);
    if (!rateLimit.allowed) {
        const response = buildPersonalizationProxyError(
            'Detectamos demasiadas solicitudes desde esta conexión. Probá de nuevo en unos segundos.',
            429,
            rateLimit,
        );
        response.headers.set('retry-after', String(rateLimit.retryAfterSeconds));
        return response;
    }

    const { orderCode } = await context.params;
    const normalizedOrderCode = decodeURIComponent(orderCode || '').trim();

    if (!normalizedOrderCode) {
        return buildPersonalizationProxyError('Falta el código de orden.', 400, rateLimit);
    }

    try {
        const upstreamUrl = new URL(
            `${getPersonalizationUpstreamBaseUrl()}/order/${encodeURIComponent(normalizedOrderCode)}`,
        );
        const transactionId = request.nextUrl.searchParams.get('transactionId')?.trim();
        const accessToken = request.nextUrl.searchParams.get('accessToken')?.trim();

        if (transactionId) {
            upstreamUrl.searchParams.set('transactionId', transactionId);
        }
        if (accessToken) {
            upstreamUrl.searchParams.set('accessToken', accessToken);
        }

        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers: buildPersonalizationForwardHeaders(request),
            cache: 'no-store',
        });
        const responseText = await upstreamResponse.text();
        const response = new NextResponse(responseText, {
            status: upstreamResponse.status,
            headers: {
                'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
            },
        });

        response.headers.set('cache-control', 'no-store');
        response.headers.set('vary', 'origin');
        return response;
    } catch (error) {
        console.error('No se pudo conectar el proxy de personalización con Vendure', error);
        return buildPersonalizationProxyError(
            'No pudimos conectar con el módulo de personalización.',
            502,
            rateLimit,
        );
    }
}

