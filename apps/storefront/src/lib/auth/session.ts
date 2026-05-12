import 'server-only';

import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getErrorMessage } from '@/lib/network/timeoutFetch';
import { STOREFRONT_VENDURE_SESSION_COOKIE } from '@/lib/auth/storefrontVendureSession';
import { GET_STOREFRONT_STATE_QUERY, type StorefrontStateResponse } from '@/lib/vendure/shop';
import { fetchServerShopApi } from '@/lib/vendure/server';
import { buildLoginRedirectHref, resolveRedirectTarget } from './redirects';

export async function getServerStorefrontState(): Promise<StorefrontStateResponse | null> {
    const cookieStore = await cookies();
    if (!cookieStore.get(STOREFRONT_VENDURE_SESSION_COOKIE)?.value) {
        return null;
    }

    try {
        return await fetchServerShopApi<StorefrontStateResponse>(GET_STOREFRONT_STATE_QUERY);
    } catch (error) {
        console.warn('No se pudo resolver la sesión del storefront desde servidor:', getErrorMessage(error));
        return null;
    }
}

export async function getRequestRedirectTarget(fallback = '/mi-cuenta'): Promise<string> {
    const requestHeaders = await headers();
    return resolveRedirectTarget(requestHeaders.get('x-storefront-path'), fallback);
}

export async function requireCustomerSession(
    fallbackRedirectTarget = '/mi-cuenta',
): Promise<StorefrontStateResponse> {
    const storefrontState = await getServerStorefrontState();
    const redirectTarget = await getRequestRedirectTarget(fallbackRedirectTarget);

    if (!storefrontState) {
        redirect(
            buildLoginRedirectHref(redirectTarget, {
                authError: 'session-unavailable',
            }),
        );
    }

    if (!storefrontState.activeCustomer) {
        redirect(buildLoginRedirectHref(redirectTarget));
    }

    return storefrontState;
}
