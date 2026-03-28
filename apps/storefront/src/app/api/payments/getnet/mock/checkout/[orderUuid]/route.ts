import { NextRequest, NextResponse } from 'next/server';

const GETNET_API_URL = process.env.GETNET_INTERNAL_API_URL || 'http://localhost:4003/payments/getnet';
const BACKEND_GETNET_API_URL = (() => {
    const vendureInternalApiUrl = process.env.VENDURE_INTERNAL_API_URL || 'http://backend:3001/shop-api';
    return vendureInternalApiUrl.replace(/\/shop-api\/?$/, '') + '/payments/getnet';
})();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orderUuid: string }> },
) {
    try {
        const { orderUuid } = await params;

        if (!orderUuid) {
            return NextResponse.json({ error: 'Falta el UUID de la orden' }, { status: 400 });
        }

        const search = request.nextUrl.search || '';
        const candidateUrls = [
            `${BACKEND_GETNET_API_URL}/mock/checkout/${encodeURIComponent(orderUuid)}${search}`,
            `${GETNET_API_URL}/mock/checkout/${encodeURIComponent(orderUuid)}${search}`,
        ];

        let response: Response | null = null;
        let lastError: unknown = null;

        for (const candidateUrl of candidateUrls) {
            try {
                console.log(`[api/payments/getnet/mock/checkout] Trying ${candidateUrl}`);
                const candidateResponse = await fetch(candidateUrl, {
                    method: 'GET',
                    headers: {
                        Accept: 'text/html,application/json',
                    },
                    redirect: 'manual',
                });

                if (candidateResponse.status !== 404) {
                    response = candidateResponse;
                    break;
                }
            } catch (error) {
                lastError = error;
            }
        }

        if (!response) {
            throw lastError instanceof Error
                ? lastError
                : new Error('No se pudo contactar el checkout mock de Getnet');
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                return NextResponse.json(
                    { error: 'La redirección mock de Getnet no devolvió destino' },
                    { status: 502 },
                );
            }
            return NextResponse.redirect(location, response.status);
        }

        const contentType = response.headers.get('content-type') || '';
        const body = await response.text();

        if (!response.ok) {
            if (contentType.includes('application/json')) {
                try {
                    const data = JSON.parse(body);
                    return NextResponse.json(
                        { error: data.error || 'Error en checkout mock de Getnet' },
                        { status: response.status },
                    );
                } catch {
                    // fall through to plain text error
                }
            }

            return new NextResponse(body, {
                status: response.status,
                headers: {
                    'Content-Type': contentType || 'text/plain; charset=utf-8',
                },
            });
        }

        return new NextResponse(body, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
        console.error('[api/payments/getnet/mock/checkout] Error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
