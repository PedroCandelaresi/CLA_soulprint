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

function resolveVendureApiUrl(): string {
    const publicApiUrl = readEnv('NEXT_PUBLIC_VENDURE_API_URL');

    if (typeof window !== 'undefined') {
        return publicApiUrl || DEFAULT_BROWSER_VENDURE_API_URL;
    }

    return (
        readEnv('VENDURE_INTERNAL_API_URL') ||
        resolveServerVendureApiUrlFromPublicValue(publicApiUrl) ||
        DEFAULT_SERVER_VENDURE_API_URL
    );
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

    const res = await fetch(vendureApiUrl, {
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
