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
    baseCents?: number;
    weightSurchargeCents?: number;
    insuranceCents?: number;
    taxCents?: number;
    lastMileCents?: number;
}

export interface AndreaniQuoteResult {
    carrier: 'andreani';
    serviceCode: string;
    serviceName: string;
    priceCents: number;
    currency: string;
    estimatedDelivery?: string;
    providerMode: 'real' | 'mock';
    isSimulated: boolean;
    breakdown?: AndreaniQuoteBreakdown;
    rawResponse?: Record<string, unknown>;
}

export interface AndreaniApiErrorResponse {
    success: false;
    error: string;
}

export interface AndreaniQuoteSuccessResponse {
    success: true;
    data: AndreaniQuoteResult;
}

export type AndreaniQuoteResponse = AndreaniQuoteSuccessResponse | AndreaniApiErrorResponse;

export interface AndreaniSelectionRequest {
    orderCode?: string;
    carrier: string;
    serviceCode: string;
    serviceName: string;
    priceCents: number;
    currency: string;
    destinationPostalCode: string;
    destinationCity: string;
    metadata?: string | Record<string, unknown>;
    weightKg?: number;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
    volume?: number;
    providerMode?: 'real' | 'mock';
    isSimulated?: boolean;
}

export interface AndreaniSelectionSuccessResponse {
    success: true;
    orderId?: string;
}

export type AndreaniSelectionResponse = AndreaniSelectionSuccessResponse | AndreaniApiErrorResponse;

export interface AndreaniLogisticsData {
    shippingQuoteCode?: string;
    shippingMethodLabel?: string;
    shippingPriceCents?: number;
    shippingSnapshotJson?: string | Record<string, unknown>;
    andreaniCarrier?: string;
    andreaniServiceCode?: string;
    andreaniServiceName?: string;
    // TODO(migration): remove legacy float field after old orders/admin views stop depending on it.
    andreaniPrice?: number;
    andreaniCurrency?: string;
    andreaniDestinationPostalCode?: string;
    andreaniDestinationCity?: string;
    andreaniSelectionMetadata?: string | Record<string, unknown>;
    andreaniWeightKg?: number;
    andreaniDimensions?: string;
    andreaniShipmentCreated?: boolean;
    andreaniShipmentDate?: string;
    andreaniShipmentId?: string;
    andreaniTrackingNumber?: string;
    andreaniShipmentStatus?: string;
    andreaniShipmentRawResponse?: string;
}

export interface AndreaniOrderLogisticsSuccessResponse {
    success: true;
    data: AndreaniLogisticsData;
}

export type AndreaniOrderLogisticsResponse = AndreaniOrderLogisticsSuccessResponse | AndreaniApiErrorResponse;
