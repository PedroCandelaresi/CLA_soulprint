export type AndreaniProviderMode = 'real' | 'mock';

export interface AndreaniQuoteResult {
    carrier: 'andreani';
    serviceCode: string;
    serviceName: string;
    priceCents: number;
    currency: string;
    estimatedDelivery?: string;
    providerMode: AndreaniProviderMode;
    isSimulated: boolean;
    breakdown?: AndreaniQuoteBreakdown;
    rawResponse?: Record<string, unknown>;
}

export interface AndreaniQuoteResponsePayload {
    FleteAereo?: number;
    Seguro?: number;
    TasaImportacion?: number;
    UltimaMilla?: number;
    CostoDesaduanaje?: number;
    pesoAforado?: string;
    tarifaSinIva?: Record<string, string>;
    tarifaConIva?: Record<string, string>;
    [key: string]: unknown;
}

export interface AndreaniQuoteBreakdown {
    baseCents?: number;
    weightSurchargeCents?: number;
    insuranceCents?: number;
    taxCents?: number;
    lastMileCents?: number;
}

export interface AndreaniShipmentResponsePayload {
    IdEnvio?: string;
    FechaEntrega?: string;
    Estado?: string;
    NumeroGuia?: string;
    NumeroGuiaHija?: string;
    Observaciones?: string;
    [key: string]: unknown;
}
