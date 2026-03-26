import { NextRequest, NextResponse } from 'next/server';

// Getnet standalone server URL (port 4003)
const GETNET_API_URL = process.env.GETNET_INTERNAL_API_URL || 'http://localhost:4003/payments/getnet';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    try {
        const { uuid } = await params;
        
        if (!uuid) {
            return NextResponse.json({ error: 'Falta el UUID de la orden' }, { status: 400 });
        }
        
        // Forward to backend
        const backendUrl = `${GETNET_API_URL}/order/${encodeURIComponent(uuid)}`;
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Error al consultar estado de orden' },
                { status: response.status }
            );
        }
        
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
        console.error('[api/payments/getnet/order] Error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
