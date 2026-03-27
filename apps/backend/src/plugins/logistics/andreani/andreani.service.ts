import { AndreaniClient } from './andreani.client';
import { AndreaniConfig } from './andreani.config';
import { AndreaniQuoteRequest, AndreaniQuoteResponse } from './andreani.dto';
import { AndreaniQuoteResult, AndreaniQuoteResponsePayload, AndreaniQuoteBreakdown } from './andreani.types';

export class AndreaniService {
    private client: AndreaniClient;

    constructor(private config: AndreaniConfig) {
        if (!config.enabled) {
            throw new Error('Andreani integration is disabled.');
        }
        this.client = new AndreaniClient(config);
    }

    async quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResponse> {
        try {
            this.validatePayload(payload);
            const response = await this.client.quote(payload);
            const result = this.mapToQuote(payload, response);
            return { success: true, data: result };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Andreani quote failed';
            console.error('[andreani] Quote failed:', message);
            return { success: false, error: message };
        }
    }

    private validatePayload(payload: AndreaniQuoteRequest): void {
        if (!payload.destinationPostalCode || !payload.destinationCity) {
            throw new Error('destinationPostalCode and destinationCity are required for Andreani quote.');
        }
        if (payload.weightKg <= 0) {
            throw new Error('weightKg must be greater than zero.');
        }
    }

    private mapToQuote(payload: AndreaniQuoteRequest, response: AndreaniQuoteResponsePayload): AndreaniQuoteResult {
        const price = this.extractPrice(response);
        const breakdown = this.buildBreakdown(response);

        return {
            carrier: 'andreani',
            serviceCode: response.UltimaMilla ? 'ultima_milla' : undefined,
            serviceName: 'Andreani Cotizador',
            price,
            currency: 'ARS',
            estimatedDelivery: undefined,
            breakdown,
            rawResponse: response,
        };
    }

    private buildBreakdown(response: AndreaniQuoteResponsePayload): AndreaniQuoteBreakdown {
        return {
            fleteAereo: response.FleteAereo,
            seguro: response.Seguro,
            tasaImportacion: response.TasaImportacion,
            ultimaMilla: response.UltimaMilla,
        };
    }

    private extractPrice(response: AndreaniQuoteResponsePayload): number {
        if (response.tarifaConIva && typeof response.tarifaConIva === 'object') {
            const tarifa = response.tarifaConIva as Record<string, string>;
            if (tarifa.total) {
                return Number(tarifa.total);
            }
        }
        const fallbackFields = ['UltimaMilla', 'FleteAereo', 'Seguro', 'TasaImportacion', 'CostoDesaduanaje'];
        const sum = fallbackFields.reduce((acc, key) => {
            const value = response[key];
            if (typeof value === 'number') {
                return acc + value;
            }
            return acc;
        }, 0);
        if (sum > 0) {
            return sum;
        }
        throw new Error('Could not determine Andreani quote price.');
    }
}
