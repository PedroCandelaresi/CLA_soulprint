import { NextRequest, NextResponse } from 'next/server';

const GETNET_API_URL = process.env.GETNET_INTERNAL_API_URL || 'http://localhost:4003/payments/getnet';

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
        const backendUrl = `${GETNET_API_URL}/mock/checkout/${encodeURIComponent(orderUuid)}${search}`;
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                Accept: 'text/html,application/json',
            },
            redirect: 'manual',
        });

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
