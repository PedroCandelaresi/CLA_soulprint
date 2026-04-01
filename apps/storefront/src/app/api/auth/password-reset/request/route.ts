import { NextRequest } from 'next/server';
import { performRequestPasswordReset, toJsonResponse } from '../../utils';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const emailAddress = typeof body?.emailAddress === 'string' ? body.emailAddress.trim() : '';

    if (!emailAddress || !EMAIL_REGEX.test(emailAddress)) {
        return toJsonResponse({ success: false, error: 'Ingresá un email válido.' }, 400);
    }

    try {
        const result = await performRequestPasswordReset({
            emailAddress,
            cookieHeader: request.headers.get('cookie') || undefined,
        });
        return toJsonResponse(result.body, 200);
    } catch {
        return toJsonResponse({ success: true }, 200);
    }
}
