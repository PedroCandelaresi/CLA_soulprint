import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveCustomerWithHeaders, performUpdateCustomer } from '@/app/api/auth/utils';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { getActiveOrder } from '@/lib/vendure/cart';

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
    phone: string;
}): string | null {
    if (input.fullName.trim().length < 3) {
        return 'Ingresá nombre y apellido del comprador.';
    }
    if (getDigits(input.phone).length < 8) {
        return 'Ingresá un teléfono válido.';
    }
    return null;
}

function buildBuyerBackendUrl(): string {
    const vendureApiUrl = process.env.VENDURE_INTERNAL_API_URL
        || process.env.NEXT_PUBLIC_VENDURE_API_URL
        || 'http://localhost:3001/shop-api';

    return vendureApiUrl.replace(/\/shop-api\/?$/, '/checkout/buyer');
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
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';

    const validationError = validateBuyerInput({ fullName, phone });
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    try {
        const customerResult = await fetchActiveCustomerWithHeaders(cookieHeader).catch(() => null);
        const customer = customerResult?.customer ?? null;
        if (!customer || !EMAIL_REGEX.test(customer.emailAddress.trim())) {
            const response = NextResponse.json({
                error: 'Necesitás iniciar sesión con una cuenta verificada para guardar los datos del comprador.',
            }, { status: 401 });
            if (customerResult) {
                appendVendureSetCookieHeaders(customerResult.headers, response.headers);
            }
            return response;
        }

        const response = NextResponse.json({ ok: true });
        if (customerResult) {
            appendVendureSetCookieHeaders(customerResult.headers, response.headers);
        }

        const { firstName, lastName } = splitFullName(fullName);
        const updateResult = await performUpdateCustomer({
            firstName,
            lastName,
            phoneNumber: phone,
            cookieHeader,
        });

        if (!updateResult.body.success) {
            return NextResponse.json({ error: updateResult.body.error || 'No se pudo actualizar la cuenta.' }, { status: 400 });
        }

        appendVendureSetCookieHeaders(updateResult.headers, response.headers);

        const backendResponse = await fetch(buildBuyerBackendUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: JSON.stringify({
                fullName,
                email: customer.emailAddress,
                phone,
            }),
            cache: 'no-store',
        });

        appendVendureSetCookieHeaders(backendResponse.headers, response.headers);
        const payload = await backendResponse.json() as {
            success?: boolean;
            data?: {
                orderCode: string;
                buyer: {
                    fullName: string | null;
                    email: string | null;
                    phone: string | null;
                } | null;
            };
            error?: string;
        };

        if (!backendResponse.ok || payload.success !== true || !payload.data) {
            return NextResponse.json(
                { error: payload.error || 'No se pudieron guardar los datos del comprador.' },
                { status: backendResponse.status || 400 },
            );
        }

        const activeOrderResult = await getActiveOrder(cookieHeader);
        appendVendureSetCookieHeaders(activeOrderResult.headers, response.headers);

        return NextResponse.json({
            cart: activeOrderResult.cart,
            buyer: payload.data.buyer,
        }, {
            headers: response.headers,
        });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
