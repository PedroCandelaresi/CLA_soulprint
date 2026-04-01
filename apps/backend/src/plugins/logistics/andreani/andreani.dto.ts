import { AndreaniProviderMode, AndreaniQuoteResult } from './andreani.types';

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

export interface AndreaniQuoteResponse {
    success: boolean;
    data?: AndreaniQuoteResult;
    error?: string;
}

export interface AndreaniShippingSelection {
    request: AndreaniQuoteRequest;
    quote?: AndreaniQuoteResult;
    serviceIdentifier?: string;
    trackingId?: string;
    // TODO: In future phases, persist the Andreani service details used for this order.
}

export interface AndreaniSelectionPayload {
    orderId?: string;
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
    providerMode?: AndreaniProviderMode;
    isSimulated?: boolean;
}

export interface AndreaniSelectionResponse {
    success: boolean;
    orderId?: string;
    error?: string;
}

export interface AndreaniSelectionSnapshot {
    orderCode: string;
    carrier: string;
    quoteCode: string;
    methodLabel: string;
    priceCents: number;
    currency: string;
    destinationPostalCode: string;
    destinationCity: string;
    weightKg?: number;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
    volume?: number;
    providerMode: AndreaniProviderMode;
    isSimulated: boolean;
    metadata?: Record<string, unknown> | null;
    selectedAt: string;
}

export interface AndreaniShipmentRequest {
    orderId: string;
    contrato?: string;
    cliente?: string;
    origenSucursal?: string;
    cpOrigen?: string;
    ciudadOrigen?: string;
    provinciaOrigen?: string;
    destinoPostalCode: string;
    destinoCiudad: string;
    destinoProvincia?: string;
    pesoKg: number;
    volumen?: number;
    categoria?: string;
    valorDeclarado?: number;
    numeroBultos?: number;
    altoCm?: number;
    anchoCm?: number;
    largoCm?: number;
    destinatario?: {
        nombre?: string;
        apellido?: string;
        telefono?: string;
        email?: string;
        domicilio?: string;
        provincia?: string;
    };
}

export interface AndreaniShipmentResponse {
    success: boolean;
    trackingNumber?: string;
    shipmentId?: string;
    response?: Record<string, unknown>;
    error?: string;
}
