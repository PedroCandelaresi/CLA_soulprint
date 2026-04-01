import { NextRequest } from 'next/server';
import { appendVendureCookies, buildAuthProxyContext, performResetPassword, toJsonResponse } from '../../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const token = typeof body?.token === 'string' ? body.token.replace(/ /g, '+').trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
        return toJsonResponse({
            success: false,
            error: 'El token y la contraseña son obligatorios.',
        }, 400);
    }

    try {
        const result = await performResetPassword({
            token,
            password,
            ...buildAuthProxyContext(request),
        });

        const status = result.body.success ? 200 : 400;
        return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.';
        return toJsonResponse({ success: false, error: message }, 500);
    }
}
