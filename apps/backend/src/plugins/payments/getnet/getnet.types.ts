/**
 * Getnet Checkout API Types
 * Based on: https://api-santander.preprod.geopagos.com
 */

export type GetnetMode = 'real' | 'mock';
export type GetnetMockForceStatus =
    | 'interactive'
    | 'pending'
    | 'processing'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'expired';

// ============================================================================
// OAuth Types
// ============================================================================

export interface GetnetOAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export interface GetnetOAuthConfig {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
}

// ============================================================================
// Order Item Types
// ============================================================================

export interface GetnetItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: {
        currency: string;
        amount: number;
    };
}

// ============================================================================
// Shipping Types
// ============================================================================

export interface GetnetShipping {
    firstName: string;
    lastName: string;
    address: {
        street: string;
        number: string;
        complement?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
}

// ============================================================================
// Redirect URLs Types
// ============================================================================

export interface GetnetRedirectUrls {
    success: string;
    failed: string;
}

// ============================================================================
// Order Request Types
// ============================================================================

export interface GetnetOrderRequest {
    currency: string;
    items: GetnetItem[];
    shipping?: GetnetShipping;
    redirectUrls?: GetnetRedirectUrls;
    webhookUrl?: string;
    expireLimitMinutes?: number;
}

// ============================================================================
// Order Response Types (JSON:API format)
// ============================================================================

export interface GetnetOrderLink {
    rel: string;
    href: string;
    media?: string;
    type?: string;
}

export interface GetnetOrderDataAttributes {
    currency: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    totalAmount?: {
        currency: string;
        amount: number;
    };
    links: GetnetOrderLink[];
}

export interface GetnetOrderData {
    id: string;
    type: string;
    attributes: GetnetOrderDataAttributes;
}

export interface GetnetOrderResponse {
    data: GetnetOrderData;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface GetnetWebhookPayload {
    event: string;
    timestamp: string;
    orderId: string;
    orderUuid: string;
    status: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Internal DTOs
// ============================================================================

/**
 * Input for creating a checkout session from the frontend cart
 */
export interface CreateCheckoutDto {
    orderCode: string;
    items: Array<{
        id: string;
        name: string;
        quantity: number;
        unitPrice: number; // in cents
    }>;
    shippingCost?: number; // in cents
    customerEmail?: string;
    successUrl?: string;
    failedUrl?: string;
}

/**
 * Response returned to frontend after creating checkout
 */
export interface CheckoutResponse {
    mode: GetnetMode;
    status: string;
    checkoutId: string;            // Provider checkout/order UUID alias
    transactionId: string;           // Local transaction ID
    orderUuid: string;              // Getnet order UUID
    processUrl: string;             // Preferred redirect URL
    checkoutUrl: string;            // Redirect URL
    vendureOrderCode: string;       // Internal order code
    expiresAt?: string;
    raw?: unknown;
    rawResponse?: {
        status?: string;
        createdAt?: string;
    } | null;
}

/**
 * Order status response - includes both Getnet and local state
 */
export interface OrderStatusResponse {
    transactionId: string;
    orderUuid: string;
    vendureOrderCode: string;
    status: string;                 // Local status
    providerStatus?: string;        // Getnet status
    createdAt: string;
    updatedAt?: string;
    expiresAt?: string;
    approvedAt?: string;
    isTerminal: boolean;
    webhookEventCount: number;
    rawResponse?: GetnetOrderResponse;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface GetnetPluginConfig {
    authBaseUrl: string;
    checkoutBaseUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    mode?: GetnetMode;
    mockForceStatus?: GetnetMockForceStatus;
    currency: string;
    webhookUrl?: string;
    successUrl?: string;
    failedUrl?: string;
    expireLimitMinutes?: number;
    requestTimeout?: number;
}
