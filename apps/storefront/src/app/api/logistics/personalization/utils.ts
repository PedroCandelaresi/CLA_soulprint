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

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean {
    return value === true;
}

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function normalizeLineAsset(line: Record<string, unknown>): Record<string, unknown> {
    const asset = readRecord(line.asset);
    if (!asset) {
        return { ...line, asset: null };
    }

    return {
        ...line,
        asset: {
            ...asset,
            source: normalizeAssetUrl(asset.source),
            preview: normalizeAssetUrl(asset.preview),
        },
    };
}

function deriveOverallStatus(lines: Array<Record<string, unknown>>): string {
    const requiredLines = lines.filter((line) => readBoolean(line.requiresPersonalization));
    if (requiredLines.length === 0) {
        return 'not-required';
    }

    const completedLines = requiredLines.filter((line) => {
        const status = readString(line.personalizationStatus);
        return status === 'uploaded' || status === 'approved';
    });

    if (completedLines.length === 0) {
        return 'pending';
    }
    if (completedLines.length < requiredLines.length) {
        return 'partial';
    }
    return 'complete';
}

function buildLegacyLines(data: Record<string, unknown>): Array<Record<string, unknown>> {
    const requiredItems = Array.isArray(data.requiredItems) ? data.requiredItems : [];
    const overallStatus = readString(data.overallPersonalizationStatus) ?? 'not-required';
    const fallbackAsset =
        readString(data.assetId) || readString(data.assetUrl) || readString(data.assetPreviewUrl)
            ? {
                id: readString(data.assetId) ?? '',
                source: normalizeAssetUrl(data.assetUrl),
                preview: normalizeAssetUrl(data.assetPreviewUrl),
                mimeType: readString(data.assetMimeType) ?? '',
                fileSize: readNumber(data.assetFileSize) ?? 0,
            }
            : null;

    return requiredItems
        .map(readRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item, index) => ({
            orderLineId: readString(item.orderLineId) ?? `legacy-line-${index + 1}`,
            productName: readString(item.productName) ?? 'Producto',
            variantName: readString(item.variantName) ?? '',
            requiresPersonalization: true,
            personalizationStatus: overallStatus === 'complete' ? 'uploaded' : 'pending-upload',
            asset: index === 0 ? fallbackAsset : null,
            notes: index === 0 ? readString(data.notes) : null,
            uploadedAt: index === 0 ? readString(data.uploadedAt) : null,
            snapshotFileName: index === 0 ? readString(data.originalFilename) : null,
        }));
}

function normalizePersonalizationData(data: Record<string, unknown>): Record<string, unknown> {
    const providedLines = Array.isArray(data.lines) ? data.lines : [];
    const normalizedLines = (
        providedLines.length > 0
            ? providedLines.map(readRecord).filter((line): line is Record<string, unknown> => Boolean(line))
            : buildLegacyLines(data)
    ).map((line) => normalizeLineAsset(line));

    const overallPersonalizationStatus = readString(data.overallPersonalizationStatus) ?? deriveOverallStatus(normalizedLines);
    const requiresPersonalization =
        readBoolean(data.requiresPersonalization)
        || normalizedLines.some((line) => readBoolean(line.requiresPersonalization))
        || ['pending', 'partial', 'complete'].includes(overallPersonalizationStatus);

    return {
        ...data,
        requiresPersonalization,
        overallPersonalizationStatus,
        lines: normalizedLines,
    };
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
        data: normalizePersonalizationData(data as Record<string, unknown>),
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
