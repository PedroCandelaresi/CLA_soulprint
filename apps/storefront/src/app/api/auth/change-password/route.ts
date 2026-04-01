import { NextRequest } from 'next/server';
import {
    appendVendureCookies,
    performUpdateCustomerPassword,
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

    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
        return toJsonResponse({
            success: false,
            error: 'La contraseña actual y la nueva contraseña son obligatorias.',
        }, 400);
    }

    try {
        const result = await performUpdateCustomerPassword({
            currentPassword,
            newPassword,
            cookieHeader: request.headers.get('cookie') || undefined,
        });

        const status = result.body.success ? 200 : 400;
        return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo actualizar la contraseña.', 502);
    }
}
