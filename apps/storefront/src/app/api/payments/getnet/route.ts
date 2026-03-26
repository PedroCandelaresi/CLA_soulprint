import { NextRequest, NextResponse } from 'next/server';

// Getnet standalone server URL (port 4003)
const GETNET_API_URL = process.env.GETNET_INTERNAL_API_URL || 'http://localhost:4003/payments/getnet';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'Error al procesar la solicitud de pago';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.orderCode) {
            return NextResponse.json({ error: 'Falta el código de orden' }, { status: 400 });
        }
        
        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
        }
        
        // Validate each item
        for (const item of body.items) {
            if (!item.name || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
                return NextResponse.json({ error: 'Datos de producto inválidos' }, { status: 400 });
            }
        }
        
        // Forward to backend
        const backendUrl = `${GETNET_API_URL}/checkout`;
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Error al crear checkout' },
                { status: response.status }
            );
        }
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('[api/payments/getnet] Error:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
