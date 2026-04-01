import { Injectable } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockQuoteOption {
    code: string;           // 'mock-standard' | 'mock-express'
    name: string;
    priceCents: number;     // integer centavos
    currencyCode: 'ARS';
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    isSimulated: true;
}

export interface MockQuoteResult {
    success: true;
    postalCode: string;
    city: string;
    weightKg: number;
    zone: string;
    options: MockQuoteOption[];
}

export interface MockSelectionSnapshot {
    orderCode: string;
    quoteCode: string;          // 'mock-standard' | 'mock-express'
    methodLabel: string;
    priceCents: number;
    currencyCode: 'ARS';
    postalCode: string;
    city: string;
    weightKg: number;
    selectedAt: string;         // ISO date
    isSimulated: true;
}

// ---------------------------------------------------------------------------
// Zone configuration
// ---------------------------------------------------------------------------

interface ZoneConfig {
    name: string;
    base: number;
    perKg: number;
    daysMin: number;
    daysMax: number;
}

function resolveZone(postalCode: string): ZoneConfig {
    const cp = parseInt(postalCode, 10);

    if (cp >= 1000 && cp <= 1499) {
        return { name: 'CABA',      base: 180000, perKg: 8000,  daysMin: 2,  daysMax: 4  };
    }
    if (cp >= 1500 && cp <= 1999) {
        return { name: 'GBA',       base: 250000, perKg: 12000, daysMin: 3,  daysMax: 6  };
    }
    if (cp >= 2000 && cp <= 3999) {
        return { name: 'Pcia BA',   base: 350000, perKg: 18000, daysMin: 4,  daysMax: 8  };
    }
    if (cp >= 4000 && cp <= 5999) {
        return { name: 'Centro',    base: 480000, perKg: 22000, daysMin: 5,  daysMax: 10 };
    }
    if (cp >= 6000 && cp <= 9999) {
        return { name: 'Interior',  base: 620000, perKg: 28000, daysMin: 8,  daysMax: 14 };
    }

    return { name: 'Unknown',   base: 750000, perKg: 35000, daysMin: 10, daysMax: 18 };
}

// ---------------------------------------------------------------------------
// Price helpers
// ---------------------------------------------------------------------------

function calcStandardPrice(zone: ZoneConfig, weightKg: number): number {
    return Math.round((zone.base + Math.ceil(weightKg) * zone.perKg) / 100) * 100;
}

function calcExpressPrice(standardPrice: number): number {
    return Math.round((standardPrice * 1.45) / 100) * 100;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class MockLogisticsService {
    /**
     * Returns two shipping options (standard + express) for the given postal
     * code and parcel weight.
     *
     * @throws if postalCode is not numeric or weightKg is not > 0.
     */
    quote(postalCode: string, cityName: string, weightKg: number): MockQuoteResult[] {
        if (!postalCode || !/^\d+$/.test(postalCode.trim())) {
            throw new Error(`[mock-logistics] postalCode must be a non-empty numeric string, got: "${postalCode}"`);
        }
        if (!Number.isFinite(weightKg) || weightKg <= 0) {
            throw new Error(`[mock-logistics] weightKg must be a positive number, got: ${weightKg}`);
        }

        const zone = resolveZone(postalCode.trim());
        const standardPrice = calcStandardPrice(zone, weightKg);
        const expressPrice  = calcExpressPrice(standardPrice);

        const standard: MockQuoteOption = {
            code: 'mock-standard',
            name: 'Envío estándar (simulado)',
            priceCents: standardPrice,
            currencyCode: 'ARS',
            estimatedDaysMin: zone.daysMin,
            estimatedDaysMax: zone.daysMax,
            isSimulated: true,
        };

        const express: MockQuoteOption = {
            code: 'mock-express',
            name: 'Envío express (simulado)',
            priceCents: expressPrice,
            currencyCode: 'ARS',
            estimatedDaysMin: Math.max(1, Math.floor(zone.daysMin / 2)),
            estimatedDaysMax: Math.max(1, Math.floor(zone.daysMax / 2)),
            isSimulated: true,
        };

        const result: MockQuoteResult = {
            success: true,
            postalCode: postalCode.trim(),
            city: cityName,
            weightKg,
            zone: zone.name,
            options: [standard, express],
        };

        console.log(
            `[mock-logistics] quote — cp=${postalCode} zone=${zone.name} weightKg=${weightKg} ` +
            `standard=${standardPrice} express=${expressPrice}`,
        );

        return [result];
    }

    /**
     * Builds the snapshot object to be persisted in Order.customFields.
     */
    buildSelectionSnapshot(
        orderCode: string,
        quote: MockQuoteOption,
        postalCode: string,
        city: string,
        weightKg: number,
    ): MockSelectionSnapshot {
        return {
            orderCode,
            quoteCode: quote.code,
            methodLabel: quote.name,
            priceCents: quote.priceCents,
            currencyCode: 'ARS',
            postalCode,
            city,
            weightKg,
            selectedAt: new Date().toISOString(),
            isSimulated: true,
        };
    }
}
