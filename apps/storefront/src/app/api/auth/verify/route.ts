import { NextRequest } from 'next/server';
import { appendVendureCookies, buildAuthProxyContext, performVerifyCustomerAccount, toJsonResponse } from '../utils';

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
            error: 'El token de verificación y la contraseña son obligatorios.',
        }, 400);
    }

    console.log(
        `[api/auth/verify] Incoming verification request tokenPrefix="${token.slice(0, 12)}..." passwordLength=${password.length}`,
    );

    try {
        const result = await performVerifyCustomerAccount({
            token,
            password,
            ...buildAuthProxyContext(request),
        });

        console.log(
            `[api/auth/verify] Verification result success=${result.body.success} tokenPrefix="${token.slice(0, 12)}..."`,
        );

        const status = result.body.success ? 200 : 400;
        return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo verificar la cuenta.';
        console.error(
            `[api/auth/verify] Verification request failed tokenPrefix="${token.slice(0, 12)}..." error="${message}"`,
        );
        return toJsonResponse({
            success: false,
            error: message || 'No se pudo verificar la cuenta.',
        }, 500);
    }
}
