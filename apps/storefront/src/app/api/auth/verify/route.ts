import { NextRequest } from 'next/server';
import { appendVendureCookies, performVerifyCustomerAccount, toJsonResponse } from '../utils';

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

    const result = await performVerifyCustomerAccount({
        token,
        password,
        cookieHeader: request.headers.get('cookie') || undefined,
    });

    const status = result.body.success ? 200 : 400;
    return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
}
