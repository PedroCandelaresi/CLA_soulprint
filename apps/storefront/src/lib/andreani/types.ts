export interface AndreaniQuoteRequest {
    destinationPostalCode: string;
    destinationCity: string;
    destinationCountryCode?: string;
    weightKg: number;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
    volume?: number;
    declaredValue?: number;
    orderTotal?: number;
    categoryId?: string;
}

export interface AndreaniQuoteBreakdown {
    fleteAereo?: number;
    seguro?: number;
    tasaImportacion?: number;
    ultimaMilla?: number;
}

export interface AndreaniQuoteResult {
    carrier: 'andreani';
    serviceCode?: string;
    serviceName?: string;
    price: number;
    currency: string;
    estimatedDelivery?: string;
    breakdown?: AndreaniQuoteBreakdown;
    rawResponse?: Record<string, unknown>;
}

export interface AndreaniQuoteResponse {
    success: boolean;
    data?: AndreaniQuoteResult;
    error?: string;
}

export interface AndreaniSelectionRequest {
    orderCode?: string;
    carrier: string;
    serviceCode: string;
    serviceName: string;
    price: number;
    currency: string;
    destinationPostalCode: string;
    destinationCity: string;
    metadata?: string | Record<string, unknown>;
    weightKg?: number;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
    volume?: number;
}

export interface AndreaniSelectionResponse {
    success: boolean;
    orderId?: string;
    error?: string;
}

export interface AndreaniLogisticsData {
    carrier?: string;
    serviceCode?: string;
    serviceName?: string;
    price?: number;
    currency?: string;
    destinationPostalCode?: string;
    destinationCity?: string;
    shipmentCreated?: boolean;
    shipmentDate?: string;
    shipmentId?: string;
    trackingNumber?: string;
    shipmentStatus?: string;
    selectionMetadata?: string | Record<string, unknown>;
    shipmentRawResponse?: string;
}

export interface AndreaniOrderLogisticsResponse {
    success: boolean;
    data?: AndreaniLogisticsData;
    error?: string;
}
