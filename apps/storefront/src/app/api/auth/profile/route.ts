import { NextRequest } from 'next/server';
import {
    appendVendureCookies,
    fetchActiveCustomer,
    performUpdateCustomer,
    resolveAuthErrorResponse,
    toJsonResponse,
} from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const cookieHeader = request.headers.get('cookie') || undefined;

    try {
        const customer = await fetchActiveCustomer(cookieHeader);
        if (!customer) {
            return toJsonResponse({
                success: false,
                error: 'Necesitás iniciar sesión para editar tus datos.',
            }, 401);
        }

        const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
        const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
        const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
        const documentNumber = typeof body?.documentNumber === 'string' ? body.documentNumber.trim() : '';

        const result = await performUpdateCustomer({
            firstName,
            lastName,
            phoneNumber,
            documentNumber,
            cookieHeader,
        });

        return appendVendureCookies(result.headers, toJsonResponse(result.body, result.body.success ? 200 : 400));
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo actualizar tu perfil.', 502);
    }
}
