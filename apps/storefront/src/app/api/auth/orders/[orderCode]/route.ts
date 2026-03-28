import { NextRequest, NextResponse } from 'next/server';
import { loadCustomerDashboard, resolveAuthErrorResponse } from '../../utils';

export const dynamic = 'force-dynamic';

interface RouteContext {
    params: { orderCode: string } | Promise<{ orderCode: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const params = await context.params;
        const orderCode = params.orderCode;
        const data = await loadCustomerDashboard(request.headers.get('cookie') || undefined);

        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Necesitás iniciar sesión para ver este pedido.',
                },
                { status: 401 },
            );
        }

        const order = data.orders.find((item) => item.code === orderCode);
        if (!order) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'El pedido no está disponible para esta cuenta.',
                },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                customer: data.customer,
                order,
            },
        });
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo cargar el pedido.', 502);
    }
}
