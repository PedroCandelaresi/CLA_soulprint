import { AndreaniQuoteRequest } from './andreani.dto';
import { AndreaniQuoteProvider, formatEstimatedDelivery } from './andreani-provider';
import { AndreaniQuoteBreakdown, AndreaniQuoteResult } from './andreani.types';

interface ZoneConfig {
    name: string;
    baseCents: number;
    perKgCents: number;
    lastMileCents: number;
    daysMin: number;
    daysMax: number;
}

function resolveZone(postalCode: string): ZoneConfig {
    const cp = Number.parseInt(postalCode, 10);

    if (cp >= 1000 && cp <= 1499) {
        return { name: 'CABA', baseCents: 180000, perKgCents: 8000, lastMileCents: 12000, daysMin: 2, daysMax: 4 };
    }
    if (cp >= 1500 && cp <= 1999) {
        return { name: 'GBA', baseCents: 250000, perKgCents: 12000, lastMileCents: 18000, daysMin: 3, daysMax: 6 };
    }
    if (cp >= 2000 && cp <= 3999) {
        return { name: 'Buenos Aires', baseCents: 350000, perKgCents: 18000, lastMileCents: 24000, daysMin: 4, daysMax: 8 };
    }
    if (cp >= 4000 && cp <= 5999) {
        return { name: 'Centro', baseCents: 480000, perKgCents: 22000, lastMileCents: 30000, daysMin: 5, daysMax: 10 };
    }
    if (cp >= 6000 && cp <= 9999) {
        return { name: 'Interior', baseCents: 620000, perKgCents: 28000, lastMileCents: 38000, daysMin: 8, daysMax: 14 };
    }

    return { name: 'Extendida', baseCents: 750000, perKgCents: 35000, lastMileCents: 45000, daysMin: 10, daysMax: 18 };
}

function roundToNearestHundred(value: number): number {
    return Math.round(value / 100) * 100;
}

export class AndreaniMockQuoteProvider implements AndreaniQuoteProvider {
    readonly mode = 'mock' as const;

    async quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResult> {
        const postalCode = payload.destinationPostalCode.trim();
        if (!/^\d+$/.test(postalCode)) {
            throw new Error('destinationPostalCode must be a numeric string for Andreani mock quotes.');
        }

        const zone = resolveZone(postalCode);
        const billableWeightKg = Math.max(1, Math.ceil(payload.weightKg));
        const breakdown: AndreaniQuoteBreakdown = {
            baseCents: zone.baseCents,
            weightSurchargeCents: billableWeightKg * zone.perKgCents,
            lastMileCents: zone.lastMileCents,
        };

        const priceCents = roundToNearestHundred(
            (breakdown.baseCents ?? 0)
            + (breakdown.weightSurchargeCents ?? 0)
            + (breakdown.lastMileCents ?? 0),
        );

        return {
            carrier: 'andreani',
            serviceCode: 'mock-home-delivery',
            serviceName: `Andreani Mock ${zone.name}`,
            priceCents,
            currency: 'ARS',
            estimatedDelivery: formatEstimatedDelivery(zone.daysMin, zone.daysMax),
            providerMode: 'mock',
            isSimulated: true,
            breakdown,
            rawResponse: {
                mock: true,
                zone: zone.name,
                billableWeightKg,
                request: {
                    destinationPostalCode: postalCode,
                    destinationCity: payload.destinationCity,
                    weightKg: payload.weightKg,
                },
            },
        };
    }
}
