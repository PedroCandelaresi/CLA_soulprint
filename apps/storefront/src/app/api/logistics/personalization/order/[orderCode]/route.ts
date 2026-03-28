import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { buildPersonalizationBackendUrl, normalizePersonalizationPayload } from '../../utils';

export const dynamic = 'force-dynamic';

interface RouteContext {
    params: { orderCode: string } | Promise<{ orderCode: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    const params = await context.params;
    const { orderCode } = params;

    if (!orderCode) {
        return NextResponse.json({ success: false, error: 'Falta el código de orden.' }, { status: 400 });
    }

    const search = request.nextUrl.searchParams.toString();
    const backendUrl = buildPersonalizationBackendUrl(`order/${encodeURIComponent(orderCode)}${search ? `?${search}` : ''}`);
    const cookieHeader = request.headers.get('cookie');

    try {
        const response = await fetch(backendUrl, {
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            cache: 'no-store',
        });

        let responseBody: Record<string, unknown> | null = null;
        try {
            responseBody = await response.json();
        } catch {
            responseBody = { success: false, error: 'El backend no respondió JSON válido.' };
        }

        responseBody = normalizePersonalizationPayload(responseBody);

        const nextResponse = NextResponse.json(responseBody, { status: response.status });
        appendVendureSetCookieHeaders(response.headers, nextResponse.headers);
        return nextResponse;
    } catch (error) {
        console.error('[api/logistics/personalization/order] request failed:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo consultar la personalización de la orden.' },
            { status: 502 },
        );
    }
}
