import { NextRequest } from 'next/server';
import {
    appendVendureCookies,
    performRequestEmailChange,
    resolveAuthErrorResponse,
    toJsonResponse,
} from '../../utils';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const password = typeof body?.password === 'string' ? body.password : '';
    const newEmailAddress = typeof body?.newEmailAddress === 'string' ? body.newEmailAddress.trim().toLowerCase() : '';

    if (!password || !newEmailAddress) {
        return toJsonResponse({
            success: false,
            error: 'La contraseña y el nuevo email son obligatorios.',
        }, 400);
    }

    if (!EMAIL_REGEX.test(newEmailAddress)) {
        return toJsonResponse({
            success: false,
            error: 'Ingresá un email válido.',
        }, 400);
    }

    try {
        const result = await performRequestEmailChange({
            password,
            newEmailAddress,
            cookieHeader: request.headers.get('cookie') || undefined,
        });

        const status = result.body.success ? 200 : 400;
        return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo solicitar el cambio de email.', 502);
    }
}
