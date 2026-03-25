import { NextRequest, NextResponse } from 'next/server';
import { adjustOrderLine, appendVendureSetCookieHeaders, removeOrderLine } from '@/lib/vendure';

export const dynamic = 'force-dynamic';

interface RouteContext {
    params: Promise<{ lineId: string }>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo actualizar el carrito.';
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { lineId } = await context.params;
        const body = await request.json() as { quantity?: number };
        const quantity = body.quantity;

        if (!lineId) {
            return NextResponse.json({ error: 'Falta la línea del carrito a actualizar.' }, { status: 400 });
        }
        if (!Number.isInteger(quantity) || typeof quantity !== 'number' || quantity < 1) {
            return NextResponse.json({ error: 'La cantidad debe ser un entero mayor o igual a 1.' }, { status: 400 });
        }

        const result = await adjustOrderLine(request.headers.get('cookie') || undefined, lineId, quantity);
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

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { lineId } = await context.params;

        if (!lineId) {
            return NextResponse.json({ error: 'Falta la línea del carrito a eliminar.' }, { status: 400 });
        }

        const result = await removeOrderLine(request.headers.get('cookie') || undefined, lineId);
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
