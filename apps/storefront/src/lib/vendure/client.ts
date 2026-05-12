import { fetchWithTimeout } from '@/lib/network/timeoutFetch';

const DEFAULT_BROWSER_VENDURE_API_URL = '/api/shop';
const DEFAULT_SERVER_VENDURE_API_URL = 'http://localhost:3001/shop-api';

function readEnv(
    name: 'VENDURE_INTERNAL_API_URL' | 'NEXT_PUBLIC_VENDURE_API_URL' | 'NEXT_PUBLIC_SITE_URL',
): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

function resolveServerVendureApiUrlFromPublicValue(publicApiUrl: string | null): string | null {
    if (!publicApiUrl) {
        return null;
    }

    if (!publicApiUrl.startsWith('/')) {
        return publicApiUrl;
    }

    const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL');
    if (!siteUrl) {
        return null;
    }

    try {
        return new URL(publicApiUrl, siteUrl).toString();
    } catch {
        return null;
    }
}

function assertDirectServerVendureApiUrl(value: string, envName: string): string {
    if (value.startsWith('/')) {
        throw new Error(`${envName} debe apuntar directo a Vendure, no a una ruta relativa.`);
    }

    let pathname: string;
    try {
        pathname = new URL(value).pathname;
    } catch {
        throw new Error(`${envName} no es una URL válida.`);
    }

    if (pathname.replace(/\/$/, '') === '/api/shop') {
        throw new Error(`${envName} no debe apuntar al proxy /api/shop del storefront; usá /shop-api directo a Vendure.`);
    }

    if (pathname.replace(/\/$/, '') !== '/shop-api') {
        throw new Error(`${envName} debe terminar en /shop-api.`);
    }

    return value;
}

function resolveVendureApiUrl(): string {
    const publicApiUrl = readEnv('NEXT_PUBLIC_VENDURE_API_URL');

    if (typeof window !== 'undefined') {
        return publicApiUrl || DEFAULT_BROWSER_VENDURE_API_URL;
    }

    const internalApiUrl = readEnv('VENDURE_INTERNAL_API_URL');
    if (internalApiUrl) {
        return assertDirectServerVendureApiUrl(internalApiUrl, 'VENDURE_INTERNAL_API_URL');
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('Falta configurar VENDURE_INTERNAL_API_URL para llamadas server-side a Vendure.');
    }

    const resolvedPublicApiUrl = resolveServerVendureApiUrlFromPublicValue(publicApiUrl);
    if (resolvedPublicApiUrl) {
        return assertDirectServerVendureApiUrl(resolvedPublicApiUrl, 'NEXT_PUBLIC_VENDURE_API_URL');
    }

    return DEFAULT_SERVER_VENDURE_API_URL;
}

interface GraphQLError {
    message: string;
}

interface GraphQLResponse<T> {
    data: T;
    errors?: GraphQLError[];
}

export async function fetchVendure<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const vendureApiUrl = resolveVendureApiUrl();

    const res = await fetchWithTimeout(vendureApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Vendure API error: ${res.statusText}`);
    }

    const json: GraphQLResponse<T> = await res.json();
    if (json.errors) {
        console.error('Vendure GraphQL Errors:', json.errors);
        throw new Error(json.errors[0].message);
    }

    return json.data;
}
