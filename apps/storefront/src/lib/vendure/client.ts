const VENDURE_API_URL = process.env.VENDURE_INTERNAL_API_URL || process.env.NEXT_PUBLIC_VENDURE_API_URL || 'http://localhost:3001/shop-api';

interface GraphQLError {
    message: string;
}

interface GraphQLResponse<T> {
    data: T;
    errors?: GraphQLError[];
}

export async function fetchVendure<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    console.log('Fetching from Vendure:', VENDURE_API_URL);
    try {
        const res = await fetch(VENDURE_API_URL, {
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
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}
