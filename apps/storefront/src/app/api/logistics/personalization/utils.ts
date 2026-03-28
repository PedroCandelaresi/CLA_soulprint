import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';

const DEFAULT_VENDURE_API_URL =
    process.env.PERSONALIZATION_INTERNAL_API_URL ||
    process.env.VENDURE_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_VENDURE_API_URL ||
    'http://localhost:3001/shop-api';

function resolvePersonalizationBaseUrl(): string {
    if (process.env.PERSONALIZATION_INTERNAL_API_URL) {
        return process.env.PERSONALIZATION_INTERNAL_API_URL.replace(/\/+$/, '');
    }

    try {
        const parsed = new URL(DEFAULT_VENDURE_API_URL);
        return parsed.origin;
    } catch {
        return DEFAULT_VENDURE_API_URL.replace(/\/shop-api\/?$/, '');
    }
}

const PERSONALIZATION_BASE_URL = resolvePersonalizationBaseUrl();
const PERSONALIZATION_PUBLIC_ORIGIN = (() => {
    try {
        const vendurePublicUrl = process.env.NEXT_PUBLIC_VENDURE_API_URL;
        return vendurePublicUrl ? new URL(vendurePublicUrl).origin : null;
    } catch {
        return null;
    }
})();

export function buildPersonalizationBackendUrl(path: string): string {
    return `${PERSONALIZATION_BASE_URL}/logistics/personalization/${path}`.replace(/\/+$/, '');
}

function normalizeAssetUrl(value: unknown): unknown {
    if (typeof value !== 'string' || !value.startsWith('/')) {
        return value;
    }
    if (!PERSONALIZATION_PUBLIC_ORIGIN) {
        return value;
    }
    return `${PERSONALIZATION_PUBLIC_ORIGIN}${value}`;
}

export function normalizePersonalizationPayload(payload: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }

    const data = payload.data;
    if (!data || typeof data !== 'object') {
        return payload;
    }

    return {
        ...payload,
        data: {
            ...data,
            assetUrl: normalizeAssetUrl((data as Record<string, unknown>).assetUrl),
            assetPreviewUrl: normalizeAssetUrl((data as Record<string, unknown>).assetPreviewUrl),
        },
    };
}

export async function proxyPersonalizationUpload(request: NextRequest): Promise<NextResponse> {
    const formData = await request.formData();
    const backendUrl = buildPersonalizationBackendUrl('upload');
    const cookieHeader = request.headers.get('cookie');

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: formData,
        });

        let responseBody: Record<string, unknown> | null = null;
        try {
            responseBody = await response.json();
        } catch {
            responseBody = { success: false, error: 'El backend no respondió JSON válido.' };
        }

        responseBody = normalizePersonalizationPayload(responseBody);

        const nextResponse = NextResponse.json(responseBody, { status: response.status });
        appendVendureSetCookieHeaders(response.headers, nextResponse.headers);
        return nextResponse;
    } catch (error) {
        console.error('[api/logistics/personalization/upload] request failed:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo contactar al backend de personalización.' },
            { status: 502 },
        );
    }
}
