import { NextRequest, NextResponse } from 'next/server';
import { addItemToOrder, appendVendureSetCookieHeaders, getActiveOrder } from '@/lib/vendure';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo procesar la solicitud del carrito.';
}

export async function GET(request: NextRequest) {
    try {
        const result = await getActiveOrder(request.headers.get('cookie') || undefined);
        const response = NextResponse.json({ cart: result.cart });
        appendVendureSetCookieHeaders(result.headers, response.headers);
        return response;
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { productVariantId?: string; quantity?: number };
        const productVariantId = body.productVariantId?.trim();
        const quantity = typeof body.quantity === 'number' ? body.quantity : 1;

        if (!productVariantId) {
            return NextResponse.json({ error: 'Falta el variant ID para agregar al carrito.' }, { status: 400 });
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return NextResponse.json({ error: 'La cantidad debe ser un entero mayor o igual a 1.' }, { status: 400 });
        }

        const result = await addItemToOrder(request.headers.get('cookie') || undefined, productVariantId, quantity);
        const response = NextResponse.json(
            result.error ? { cart: result.cart, error: result.error } : { cart: result.cart },
            { status: result.error ? 400 : 200 },
        );
        appendVendureSetCookieHeaders(result.headers, response.headers);
        return response;
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
