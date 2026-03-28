import { NextRequest, NextResponse } from 'next/server';
import { loadCustomerDashboard, resolveAuthErrorResponse } from '../utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const data = await loadCustomerDashboard(request.headers.get('cookie') || undefined);
        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Necesitás iniciar sesión para acceder a tu dashboard.',
                },
                { status: 401 },
            );
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo cargar el dashboard.', 502);
    }
}
