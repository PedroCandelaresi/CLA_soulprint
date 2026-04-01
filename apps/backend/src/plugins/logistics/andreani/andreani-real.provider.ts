import { AndreaniClient } from './andreani.client';
import { AndreaniQuoteRequest } from './andreani.dto';
import { AndreaniQuoteProvider, toCents } from './andreani-provider';
import { AndreaniQuoteBreakdown, AndreaniQuoteResponsePayload, AndreaniQuoteResult } from './andreani.types';

export class AndreaniRealQuoteProvider implements AndreaniQuoteProvider {
    readonly mode = 'real' as const;

    constructor(private readonly client: AndreaniClient) {}

    async quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResult> {
        const response = await this.client.quote(payload);
        return this.mapToQuote(response);
    }

    private mapToQuote(response: AndreaniQuoteResponsePayload): AndreaniQuoteResult {
        const priceCents = this.extractPriceCents(response);
        const breakdown = this.buildBreakdown(response);

        return {
            carrier: 'andreani',
            serviceCode: response.UltimaMilla ? 'ultima-milla' : 'andreani-standard',
            serviceName: 'Andreani Cotizador',
            priceCents,
            currency: 'ARS',
            estimatedDelivery: undefined,
            providerMode: 'real',
            isSimulated: false,
            breakdown,
            rawResponse: response as Record<string, unknown>,
        };
    }

    private buildBreakdown(response: AndreaniQuoteResponsePayload): AndreaniQuoteBreakdown {
        return {
            baseCents: toCents(response.FleteAereo),
            insuranceCents: toCents(response.Seguro),
            taxCents: toCents(response.TasaImportacion),
            lastMileCents: toCents(response.UltimaMilla),
        };
    }

    private extractPriceCents(response: AndreaniQuoteResponsePayload): number {
        if (response.tarifaConIva && typeof response.tarifaConIva === 'object') {
            const tarifa = response.tarifaConIva as Record<string, string>;
            const totalCents = toCents(tarifa.total);
            if (typeof totalCents === 'number') {
                return totalCents;
            }
        }

        const fallbackValues = [
            response.UltimaMilla,
            response.FleteAereo,
            response.Seguro,
            response.TasaImportacion,
            response.CostoDesaduanaje,
        ];

        const sum = fallbackValues.reduce<number>((accumulator, value) => {
            return accumulator + (toCents(value) ?? 0);
        }, 0);
        if (sum > 0) {
            return sum;
        }

        throw new Error('Could not determine Andreani quote price in cents.');
    }
}
