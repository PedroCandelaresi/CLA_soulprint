import { NextRequest } from 'next/server';
import { appendVendureCookies, performRegister, toJsonResponse } from '../utils';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }

    const [firstName, ...rest] = parts;
    return {
        firstName,
        lastName: rest.join(' '),
    };
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const { firstName, lastName } = splitFullName(fullName);

    console.log(
        `[api/auth/register] Incoming registration request email=${email ? `${email.slice(0, 2)}***@${email.split('@')[1] || ''}` : '(empty)'} fullNamePresent=${Boolean(fullName)} phonePresent=${Boolean(phoneNumber)}`,
    );

    if (!fullName || !email || !phoneNumber) {
        console.warn('[api/auth/register] Validation failed: missing required fields');
        return toJsonResponse({
            success: false,
            error: 'Nombre completo, email y teléfono son obligatorios.',
        }, 400);
    }
    if (fullName.length < 3) {
        console.warn('[api/auth/register] Validation failed: fullName too short');
        return toJsonResponse({
            success: false,
            error: 'Ingresá nombre y apellido completos.',
        }, 400);
    }
    if (!EMAIL_REGEX.test(email)) {
        console.warn('[api/auth/register] Validation failed: invalid email');
        return toJsonResponse({
            success: false,
            error: 'Ingresá un email válido.',
        }, 400);
    }
    if (getDigits(phoneNumber).length < 8) {
        console.warn('[api/auth/register] Validation failed: invalid phone number');
        return toJsonResponse({
            success: false,
            error: 'Ingresá un teléfono válido.',
        }, 400);
    }

    const result = await performRegister({
        email,
        firstName,
        lastName,
        phoneNumber,
        cookieHeader: request.headers.get('cookie') || undefined,
    });

    console.log(
        `[api/auth/register] Registration result success=${result.body.success} verificationRequired=${String(result.body.verificationRequired)} email=${email ? `${email.slice(0, 2)}***@${email.split('@')[1] || ''}` : '(empty)'}`,
    );

    const status = result.body.success ? 200 : 400;
    return appendVendureCookies(result.headers, toJsonResponse(result.body, status));
}
