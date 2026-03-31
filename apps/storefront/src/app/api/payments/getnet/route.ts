import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveCustomerWithHeaders } from '@/app/api/auth/utils';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';

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
        const cookieHeader = request.headers.get('cookie') || undefined;
        const customerResult = await fetchActiveCustomerWithHeaders(cookieHeader).catch(() => null);
        const activeCustomer = customerResult?.customer ?? null;
        if (!activeCustomer) {
            const response = NextResponse.json(
                { error: 'Necesitás iniciar sesión para iniciar el pago.' },
                { status: 401 },
            );
            if (customerResult) {
                appendVendureSetCookieHeaders(customerResult.headers, response.headers);
            }
            return response;
        }

        const body = await request.json();
        
        // Validate required fields
        if (!body.orderCode) {
            const response = NextResponse.json({ error: 'Falta el código de orden' }, { status: 400 });
            if (customerResult) {
                appendVendureSetCookieHeaders(customerResult.headers, response.headers);
            }
            return response;
        }
        
        if (!body.items || body.items.length === 0) {
            const response = NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
            if (customerResult) {
                appendVendureSetCookieHeaders(customerResult.headers, response.headers);
            }
            return response;
        }
        
        // Validate each item
        for (const item of body.items) {
            if (!item.name || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
                const response = NextResponse.json({ error: 'Datos de producto inválidos' }, { status: 400 });
                if (customerResult) {
                    appendVendureSetCookieHeaders(customerResult.headers, response.headers);
                }
                return response;
            }
        }
        
        // Forward to backend
        const backendUrl = `${GETNET_API_URL}/checkout`;
        console.log(`[api/payments/getnet] Forwarding checkout to ${backendUrl}`);
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorResponse = NextResponse.json(
                { error: data.error || 'Error al crear checkout' },
                { status: response.status }
            );
            appendVendureSetCookieHeaders(response.headers, errorResponse.headers);
            if (customerResult) {
                appendVendureSetCookieHeaders(customerResult.headers, errorResponse.headers);
            }
            return errorResponse;
        }

        const successResponse = NextResponse.json(data);
        appendVendureSetCookieHeaders(response.headers, successResponse.headers);
        if (customerResult) {
            appendVendureSetCookieHeaders(customerResult.headers, successResponse.headers);
        }
        return successResponse;
    } catch (error) {
        console.error('[api/payments/getnet] Error:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
