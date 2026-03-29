import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveCustomer, performUpdateCustomer } from '@/app/api/auth/utils';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { setOrderBuyerSnapshot } from '@/lib/vendure/cart';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function getDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function validateBuyerInput(input: {
    fullName: string;
    email: string;
    phone: string;
    document: string;
}): string | null {
    if (input.fullName.trim().length < 3) {
        return 'Ingresá nombre y apellido del comprador.';
    }
    if (!EMAIL_REGEX.test(input.email.trim())) {
        return 'Ingresá un email válido.';
    }
    if (getDigits(input.phone).length < 8) {
        return 'Ingresá un teléfono válido.';
    }
    if (getDigits(input.document).length < 7) {
        return 'Ingresá un DNI / documento válido.';
    }
    return null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'No se pudieron guardar los datos del comprador.';
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown> | null = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const cookieHeader = request.headers.get('cookie') || undefined;
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const document = typeof body?.document === 'string' ? body.document.trim() : '';

    const validationError = validateBuyerInput({ fullName, email, phone, document });
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    try {
        const customer = await fetchActiveCustomer(cookieHeader).catch(() => null);
        let snapshotEmail = email;
        const response = NextResponse.json({ ok: true });

        if (customer) {
            const { firstName, lastName } = splitFullName(fullName);
            const updateResult = await performUpdateCustomer({
                firstName,
                lastName,
                phoneNumber: phone,
                documentNumber: document,
                cookieHeader,
            });

            if (!updateResult.body.success) {
                return NextResponse.json({ error: updateResult.body.error || 'No se pudo actualizar la cuenta.' }, { status: 400 });
            }

            snapshotEmail = customer.emailAddress;
            appendVendureSetCookieHeaders(updateResult.headers, response.headers);
        }

        const result = await setOrderBuyerSnapshot(cookieHeader, {
            buyerFullName: fullName,
            buyerEmail: snapshotEmail,
            buyerPhone: phone,
            buyerDocument: document,
        });

        if (result.error) {
            return NextResponse.json({ error: result.error, cart: result.cart }, { status: 400 });
        }

        appendVendureSetCookieHeaders(result.headers, response.headers);
        return NextResponse.json({
            cart: result.cart,
            buyer: result.cart?.buyer || null,
        }, {
            headers: response.headers,
        });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
