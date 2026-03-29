import type { PersonalizationStatusValue } from './personalization';

export interface CustomerSummary {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string | null;
    documentNumber?: string | null;
}

export interface CustomerOrderAddress {
    fullName: string | null;
    company: string | null;
    streetLine1: string | null;
    streetLine2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    phoneNumber: string | null;
}

export interface CustomerOrderItem {
    id: string;
    quantity: number;
    productName: string;
    productSlug: string | null;
    variantName: string;
    previewUrl: string | null;
    linePriceWithTax: number;
    requiresPersonalization: boolean;
}

export interface CustomerOrderShippingLine {
    name: string;
    priceWithTax: number;
}

export interface CustomerOrderBuyerSummary {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    document: string | null;
}

export interface CustomerOrderPaymentSummary {
    state: string | null;
    method: string | null;
    transactionId: string | null;
}

export interface CustomerOrderFulfillmentSummary {
    state: string | null;
    method: string | null;
    trackingCode: string | null;
}

export interface CustomerOrderPersonalizationSummary {
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationStatusValue;
    assetId: string | null;
    assetUrl: string | null;
    assetPreviewUrl: string | null;
    originalFilename: string | null;
    uploadedAt: string | null;
    notes: string | null;
    accessToken?: string;
}

export interface CustomerOrderLogisticsSummary {
    carrier: string | null;
    serviceName: string | null;
    shipmentStatus: string | null;
    trackingNumber: string | null;
    shipmentCreated: boolean;
}

export interface CustomerOrderSummary {
    id: string;
    code: string;
    state: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    orderPlacedAt: string | null;
    totalWithTax: number;
    currencyCode: string;
    totalQuantity: number;
    payment: CustomerOrderPaymentSummary;
    fulfillment: CustomerOrderFulfillmentSummary;
    shipmentState: string | null;
    trackingCode: string | null;
    shippingAddress: CustomerOrderAddress | null;
    billingAddress: CustomerOrderAddress | null;
    buyer: CustomerOrderBuyerSummary | null;
    shippingLines: CustomerOrderShippingLine[];
    items: CustomerOrderItem[];
    personalization: CustomerOrderPersonalizationSummary | null;
    logistics: CustomerOrderLogisticsSummary | null;
}

export interface CustomerDashboardData {
    customer: CustomerSummary;
    orders: CustomerOrderSummary[];
}

export interface AuthActionResponse {
    success: boolean;
    error?: string;
    message?: string;
    verificationRequired?: boolean;
}

export interface ActiveCustomerResponse {
    success: boolean;
    customer: CustomerSummary | null;
    error?: string;
}

export interface CustomerDashboardResponse {
    success: boolean;
    data?: CustomerDashboardData;
    error?: string;
}

export interface CustomerOrderDetailResponse {
    success: boolean;
    data?: {
        customer: CustomerSummary;
        order: CustomerOrderSummary;
    };
    error?: string;
}
