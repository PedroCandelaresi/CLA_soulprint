import 'server-only';

import { cookies, headers } from 'next/headers';
import {
    STOREFRONT_VENDURE_SESSION_COOKIE,
    stripVendureSessionTokenFromCookieHeader,
} from '@/lib/auth/storefrontVendureSession';
import { getServerVendureApiUrl } from './server-config';

interface GraphQLError {
    message: string;
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: GraphQLError[];
}

function serializeCookieHeader(values: Awaited<ReturnType<typeof cookies>>): string {
    return values
        .getAll()
        .filter((cookie) => cookie.name !== STOREFRONT_VENDURE_SESSION_COOKIE)
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
}

export async function fetchServerShopApi<T>(
    query: string,
    variables: Record<string, unknown> = {},
): Promise<T> {
    const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
    const cookieHeader = stripVendureSessionTokenFromCookieHeader(serializeCookieHeader(cookieStore));
    const vendureSessionToken =
        cookieStore.get(STOREFRONT_VENDURE_SESSION_COOKIE)?.value?.trim() || null;

    const response = await fetch(getServerVendureApiUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-proto': requestHeaders.get('x-forwarded-proto') ?? 'https',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(vendureSessionToken ? { authorization: `Bearer ${vendureSessionToken}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });

    const payload: GraphQLResponse<T> = await response.json();

    if (!response.ok) {
        throw new Error(payload.errors?.[0]?.message || 'No se pudo conectar con la tienda.');
    }

    if (payload.errors?.length) {
        throw new Error(payload.errors[0].message);
    }

    if (!payload.data) {
        throw new Error('La respuesta de la tienda no devolvió datos.');
    }

    return payload.data;
}
