import { AndreaniConfig } from './andreani.config';
import { AndreaniQuoteRequest, AndreaniQuoteResponse } from './andreani.dto';
import { AndreaniQuoteProvider } from './andreani-provider';

export class AndreaniService {
    constructor(
        config: AndreaniConfig,
        private readonly provider: AndreaniQuoteProvider,
    ) {
        if (!config.enabled) {
            throw new Error('Andreani integration is disabled.');
        }
    }

    async quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResponse> {
        try {
            this.validatePayload(payload);
            const result = await this.provider.quote(payload);
            return { success: true, data: result };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Andreani quote failed';
            console.error(`[andreani] Quote failed (mode=${this.provider.mode}):`, message);
            return { success: false, error: message };
        }
    }

    getMode(): 'real' | 'mock' {
        return this.provider.mode;
    }

    private validatePayload(payload: AndreaniQuoteRequest): void {
        if (!payload.destinationPostalCode || !payload.destinationCity) {
            throw new Error('destinationPostalCode and destinationCity are required for Andreani quote.');
        }
        if (!Number.isFinite(payload.weightKg) || payload.weightKg <= 0) {
            throw new Error('weightKg must be greater than zero.');
        }
    }
}
