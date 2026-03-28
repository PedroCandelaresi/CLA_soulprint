/**
 * Getnet Checkout API Types
 * Based on backend integration at apps/backend/src/plugins/payments/getnet/getnet.types.ts
 */

// ============================================================================
// Checkout Request/Response Types
// ============================================================================

export interface GetnetCheckoutItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number; // in cents
}

export interface CreateCheckoutRequest {
    orderCode: string;
    items: GetnetCheckoutItem[];
    shippingCost?: number; // in cents
    customerEmail?: string;
    successUrl?: string;
    failedUrl?: string;
}

export interface CreateCheckoutResponse {
    success: boolean;
    data?: CheckoutData;
    error?: string;
}

export interface CheckoutData {
    mode: 'real' | 'mock';
    status: string;
    checkoutId: string;
    transactionId: string;
    orderUuid: string;
    processUrl: string;
    checkoutUrl: string;
    vendureOrderCode: string;
    expiresAt?: string;
    raw?: unknown;
    rawResponse?: {
        status?: string;
        createdAt?: string;
    } | null;
}

// ============================================================================
// Transaction Status Types
// ============================================================================

export interface TransactionStatus {
    transactionId: string;
    orderUuid: string;
    vendureOrderCode: string;
    status: TransactionStatusValue;
    providerStatus?: string;
    amount?: number;
    currency?: string;
    createdAt: string;
    updatedAt?: string;
    expiresAt?: string;
    approvedAt?: string;
    lastEvent?: string;
    isTerminal: boolean;
    webhookEventCount: number;
}

export type TransactionStatusValue =
    | 'pending'
    | 'processing'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'expired'
    | 'unknown';

export interface TransactionStatusResponse {
    success: boolean;
    data?: TransactionStatus;
    error?: string;
}

// ============================================================================
// Order Status Types
// ============================================================================

export interface OrderStatusResponse {
    success: boolean;
    data?: {
        transactionId?: string;
        vendureOrderCode?: string;
        orderUuid: string;
        status: string;
        providerStatus?: string;
        webhookEventCount?: number;
        isTerminal?: boolean;
        approvedAt?: string;
        createdAt?: string;
    };
    error?: string;
}

// ============================================================================
// Session Storage Keys
// ============================================================================

export const GETNET_STORAGE_KEYS = {
    TRANSACTION_ID: 'getnet_transaction_id',
    ORDER_UUID: 'getnet_order_uuid',
    VENDURE_ORDER_CODE: 'getnet_vendure_order_code',
    CART_CODE: 'getnet_cart_code',
} as const;

// ============================================================================
// Status Display Configuration
// ============================================================================

export interface StatusDisplayConfig {
    title: string;
    message: string;
    icon: 'success' | 'error' | 'warning' | 'info';
    color: 'success' | 'error' | 'warning' | 'info';
}

export const STATUS_DISPLAY_MAP: Record<TransactionStatusValue, StatusDisplayConfig> = {
    approved: {
        title: '¡Pago aprobado!',
        message: 'Tu pedido ha sido procesado correctamente.',
        icon: 'success',
        color: 'success',
    },
    pending: {
        title: 'Pago pendiente',
        message: 'Estamos confirmando tu pago. Te notificaremos cuando esté listo.',
        icon: 'warning',
        color: 'warning',
    },
    processing: {
        title: 'Procesando pago',
        message: 'Tu pago está siendo procesado. Por favor espera.',
        icon: 'warning',
        color: 'warning',
    },
    rejected: {
        title: 'Pago rechazado',
        message: 'Tu pago fue rechazado por el banco o procesador de pagos.',
        icon: 'error',
        color: 'error',
    },
    cancelled: {
        title: 'Pago cancelado',
        message: 'El pago fue cancelado. Puedes intentar nuevamente.',
        icon: 'error',
        color: 'error',
    },
    expired: {
        title: 'Enlace expirado',
        message: 'El enlace de pago ha expirado. Por favor genera uno nuevo.',
        icon: 'error',
        color: 'error',
    },
    unknown: {
        title: 'Estado desconocido',
        message: 'No pudimos determinar el estado de tu pago. Contacta a soporte.',
        icon: 'info',
        color: 'info',
    },
};
