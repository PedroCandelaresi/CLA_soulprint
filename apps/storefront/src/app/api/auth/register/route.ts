import { NextRequest } from 'next/server';
import { appendVendureCookies, performRegister, toJsonResponse } from '../utils';

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
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';

    if (!email || !password) {
        return toJsonResponse({
            success: false,
            error: 'Email y contraseña son obligatorios.',
        }, 400);
    }

    const result = await performRegister({
        email,
        password,
        firstName,
        lastName,
        cookieHeader: request.headers.get('cookie') || undefined,
    });

    const status = result.body.success ? 200 : 400;
    return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
}
