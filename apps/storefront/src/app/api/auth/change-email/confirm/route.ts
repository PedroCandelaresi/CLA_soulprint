import { NextRequest } from 'next/server';
import {
    appendVendureCookies,
    performConfirmEmailChange,
    resolveAuthErrorResponse,
    toJsonResponse,
} from '../../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const token = typeof body?.token === 'string' ? body.token.replace(/ /g, '+').trim() : '';

    if (!token) {
        return toJsonResponse({
            success: false,
            error: 'El token de confirmación es obligatorio.',
        }, 400);
    }

    try {
        const result = await performConfirmEmailChange({
            token,
            cookieHeader: request.headers.get('cookie') || undefined,
        });

        const status = result.body.success ? 200 : 400;
        return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
    } catch (error) {
        return resolveAuthErrorResponse(error, 'No se pudo confirmar el cambio de email.', 502);
    }
}
