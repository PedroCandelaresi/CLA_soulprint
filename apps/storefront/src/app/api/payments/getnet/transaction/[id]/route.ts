import { NextRequest, NextResponse } from 'next/server';

// Getnet standalone server URL (port 4003)
const GETNET_API_URL = process.env.GETNET_INTERNAL_API_URL || 'http://localhost:4003/payments/getnet';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({ error: 'Falta el ID de transacción' }, { status: 400 });
        }
        
        // Forward to backend
        const backendUrl = `${GETNET_API_URL}/transaction/${encodeURIComponent(id)}`;
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Error al consultar transacción' },
                { status: response.status }
            );
        }
        
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
        console.error('[api/payments/getnet/transaction] Error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
