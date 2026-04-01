import { AndreaniQuoteRequest } from './andreani.dto';
import { AndreaniProviderMode, AndreaniQuoteResult } from './andreani.types';

export interface AndreaniQuoteProvider {
    readonly mode: AndreaniProviderMode;
    quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResult>;
}

export function formatEstimatedDelivery(minDays?: number, maxDays?: number): string | undefined {
    if (!Number.isFinite(minDays) || !Number.isFinite(maxDays) || !minDays || !maxDays) {
        return undefined;
    }

    if (minDays === maxDays) {
        return `${minDays} dias habiles`;
    }

    return `${minDays}-${maxDays} dias habiles`;
}

export function toCents(value: number | string | null | undefined): number | undefined {
    if (value == null) {
        return undefined;
    }

    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(numeric)) {
        return undefined;
    }

    return Math.round(numeric * 100);
}
