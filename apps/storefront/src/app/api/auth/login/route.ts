import { NextRequest } from 'next/server';
import { appendVendureCookies, buildAuthProxyContext, performLogin, toJsonResponse } from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const rememberMe = body?.rememberMe !== false;

    if (!email || !password) {
        return toJsonResponse({
            success: false,
            error: 'Email y contraseña son obligatorios.',
        }, 400);
    }

    const result = await performLogin({
        email,
        password,
        rememberMe,
        ...buildAuthProxyContext(request),
    });

    const status = result.body.success ? 200 : result.body.verificationRequired ? 403 : 401;
    return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
}
