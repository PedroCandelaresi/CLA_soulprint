import { NextRequest, NextResponse } from 'next/server';
import {
    buildPersonalizationForwardHeaders,
    buildPersonalizationProxyError,
    consumePersonalizationRateLimit,
    getPersonalizationUpstreamBaseUrl,
} from '@/lib/personalization/server-proxy';
import { validateShopProxyCsrf } from '@/lib/security/shopProxy';
import { getAllowedStorefrontOrigins } from '@/lib/vendure/server-config';

export async function POST(request: NextRequest) {
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

    const csrfValidation = validateShopProxyCsrf(
        request,
        getAllowedStorefrontOrigins(request.nextUrl.origin),
    );
    if (!csrfValidation.allowed) {
        return buildPersonalizationProxyError(
            csrfValidation.reason || 'La solicitud fue bloqueada por la política CSRF.',
            403,
            rateLimit,
        );
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return buildPersonalizationProxyError('Solicitud inválida.', 400, rateLimit);
    }

    try {
        const upstreamResponse = await fetch(`${getPersonalizationUpstreamBaseUrl()}/upload`, {
            method: 'POST',
            headers: buildPersonalizationForwardHeaders(request),
            body: formData,
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
        console.error('No se pudo subir la personalización a Vendure', error);
        return buildPersonalizationProxyError(
            'No pudimos conectar con el módulo de personalización.',
            502,
            rateLimit,
        );
    }
}

