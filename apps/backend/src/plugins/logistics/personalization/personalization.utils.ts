import crypto from 'node:crypto';

export function sanitizeNotes(input: unknown): string | undefined {
    if (typeof input !== 'string') {
        return undefined;
    }
    const normalized = input.trim().replace(/\s+/g, ' ');
    return normalized ? normalized.slice(0, 1000) : undefined;
}

export function normalizeMimeType(input: string | undefined): string {
    return (input || '').trim().toLowerCase();
}

export function buildPersonalizationToken(orderCode: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(orderCode).digest('base64url');
}

export function isValidPersonalizationToken(orderCode: string, token: string | undefined, secret: string): boolean {
    if (!token) {
        return false;
    }

    const expected = buildPersonalizationToken(orderCode, secret);
    const received = token.trim();

    if (expected.length !== received.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
