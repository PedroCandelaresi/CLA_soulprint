import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';

const DEFAULT_VENDURE_API_URL =
    process.env.ANDREANI_INTERNAL_API_URL ||
    process.env.VENDURE_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_VENDURE_API_URL ||
    'http://localhost:3001/shop-api';

function resolveAndreaniBaseUrl(): string {
    if (process.env.ANDREANI_INTERNAL_API_URL) {
        return process.env.ANDREANI_INTERNAL_API_URL.replace(/\/+$/, '');
    }

    try {
        const parsed = new URL(DEFAULT_VENDURE_API_URL);
        return parsed.origin;
    } catch {
        return DEFAULT_VENDURE_API_URL.replace(/\/shop-api\/?$/, '');
    }
}

const ANDREANI_BASE_URL = resolveAndreaniBaseUrl();

async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
    try {
        const body = await request.json();
        if (typeof body === 'object' && body !== null) {
            return body as Record<string, unknown>;
        }
    } catch {
        // fall through
    }
    return null;
}

export function buildAndreaniBackendUrl(path: string): string {
    return `${ANDREANI_BASE_URL}/logistics/andreani/${path}`.replace(/\/+$/, '');
}

export async function proxyAndreaniRequest(path: string, request: NextRequest): Promise<NextResponse> {
    const payload = await parseJsonBody(request);
    if (!payload) {
        return NextResponse.json(
            { success: false, error: 'El cuerpo de la solicitud debe ser JSON válido.' },
            { status: 400 },
        );
    }

    const backendUrl = buildAndreaniBackendUrl(path);
    const cookieHeader = request.headers.get('cookie');

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: JSON.stringify(payload),
        });

        let responseBody: Record<string, unknown> | null = null;
        try {
            responseBody = await response.json();
        } catch {
            responseBody = { success: false, error: 'Andreani no respondió JSON válido.' };
        }

        const nextResponse = NextResponse.json(responseBody, { status: response.status });
        appendVendureSetCookieHeaders(response.headers, nextResponse.headers);
        return nextResponse;
    } catch (error) {
        console.error('[api/logistics/andreani] failed to proxy request:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo contactar al backend de Andreani.' },
            { status: 502 },
        );
    }
}
