const VENDURE_API_URL = process.env.VENDURE_INTERNAL_API_URL || process.env.NEXT_PUBLIC_VENDURE_API_URL || 'http://localhost:3001/shop-api';

interface GraphQLError {
    message: string;
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: GraphQLError[];
}

interface VendureRequestOptions {
    variables?: Record<string, unknown>;
    headers?: HeadersInit;
    cache?: RequestCache;
}

export interface VendureFetchResult<T> {
    data: T;
    headers: Headers;
    status: number;
    statusText: string;
}

export async function fetchVendureApi<T>(query: string, options: VendureRequestOptions = {}): Promise<VendureFetchResult<T>> {
    const { variables = {}, headers, cache = 'no-store' } = options;
    const response = await fetch(VENDURE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(headers ?? {}),
        },
        body: JSON.stringify({ query, variables }),
        cache,
    });

    if (!response.ok) {
        throw new Error(`Vendure API error: ${response.status} ${response.statusText}`);
    }

    const json: GraphQLResponse<T> = await response.json();
    if (json.errors?.length) {
        throw new Error(json.errors[0].message);
    }
    if (!json.data) {
        throw new Error('Vendure API returned no data.');
    }

    return {
        data: json.data,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
    };
}

export async function fetchVendure<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: Omit<VendureRequestOptions, 'variables'> = {},
): Promise<T> {
    const { data } = await fetchVendureApi<T>(query, { ...options, variables });
    return data;
}

export function appendVendureSetCookieHeaders(sourceHeaders: Headers, targetHeaders: Headers): void {
    const headerBag = sourceHeaders as Headers & { getSetCookie?: () => string[] };
    const setCookies = headerBag.getSetCookie?.() ?? [];

    if (setCookies.length > 0) {
        for (const value of setCookies) {
            targetHeaders.append('set-cookie', value);
        }
        return;
    }

    const singleSetCookie = sourceHeaders.get('set-cookie');
    if (singleSetCookie) {
        for (const value of splitCombinedSetCookieHeader(singleSetCookie)) {
            targetHeaders.append('set-cookie', value);
        }
    }
}

function splitCombinedSetCookieHeader(value: string): string[] {
    const cookies: string[] = [];
    let current = '';
    let inExpiresAttribute = false;

    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        current += char;

        const lowerCurrent = current.toLowerCase();
        if (!inExpiresAttribute && lowerCurrent.endsWith('expires=')) {
            inExpiresAttribute = true;
            continue;
        }

        if (inExpiresAttribute && char === ';') {
            inExpiresAttribute = false;
            continue;
        }

        if (!inExpiresAttribute && char === ',' && index < value.length - 1) {
            current = current.slice(0, -1).trim();
            if (current) {
                cookies.push(current);
            }
            current = '';
        }
    }

    const trailing = current.trim();
    if (trailing) {
        cookies.push(trailing);
    }

    return cookies;
}
