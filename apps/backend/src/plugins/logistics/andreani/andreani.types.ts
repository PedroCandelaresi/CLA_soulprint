export interface AndreaniQuoteResult {
    carrier: 'andreani';
    serviceCode?: string;
    serviceName?: string;
    price: number;
    currency: string;
    estimatedDelivery?: string;
    breakdown?: AndreaniQuoteBreakdown;
    rawResponse?: AndreaniQuoteResponsePayload;
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
    fleteAereo?: number;
    seguro?: number;
    tasaImportacion?: number;
    ultimaMilla?: number;
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
