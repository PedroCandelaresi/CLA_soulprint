/**
 * Getnet Checkout API Client
 * Handles communication with the backend API routes for Getnet integration
 */

import type {
    CreateCheckoutRequest,
    CreateCheckoutResponse,
    TransactionStatusResponse,
    OrderStatusResponse,
    GETNET_STORAGE_KEYS,
} from '@/types/getnet';

// ============================================================================
// API Configuration
// ============================================================================

const GETNET_API_BASE_URL = process.env.NEXT_PUBLIC_GETNET_API_URL || '/api/payments/getnet';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'Error al procesar la solicitud';
}

// ============================================================================
// Session Storage Helpers
// ============================================================================

export const getnetStorage = {
    /**
     * Save transaction data to sessionStorage before redirect
     */
    saveTransaction: (data: {
        transactionId: string;
        orderUuid: string;
        vendureOrderCode?: string;
        cartCode?: string;
    }) => {
        if (typeof window === 'undefined') return;

        sessionStorage.setItem('getnet_transaction_id', data.transactionId);
        sessionStorage.setItem('getnet_order_uuid', data.orderUuid);
        if (data.vendureOrderCode) {
            sessionStorage.setItem('getnet_vendure_order_code', data.vendureOrderCode);
        }
        if (data.cartCode) {
            sessionStorage.setItem('getnet_cart_code', data.cartCode);
        }
    },

    /**
     * Get saved transaction ID
     */
    getTransactionId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('getnet_transaction_id');
    },

    /**
     * Get saved order UUID
     */
    getOrderUuid: (): string | null => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('getnet_order_uuid');
    },

    /**
     * Get saved Vendure order code
     */
    getVendureOrderCode: (): string | null => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('getnet_vendure_order_code');
    },

    /**
     * Get saved cart code
     */
    getCartCode: (): string | null => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('getnet_cart_code');
    },

    /**
     * Clear all stored transaction data
     */
    clearTransaction: () => {
        if (typeof window === 'undefined') return;

        sessionStorage.removeItem('getnet_transaction_id');
        sessionStorage.removeItem('getnet_order_uuid');
        sessionStorage.removeItem('getnet_vendure_order_code');
        sessionStorage.removeItem('getnet_cart_code');
    },

    /**
     * Check if there's a saved transaction
     */
    hasTransaction: (): boolean => {
        if (typeof window === 'undefined') return false;
        return (
            sessionStorage.getItem('getnet_transaction_id') !== null ||
            sessionStorage.getItem('getnet_order_uuid') !== null
        );
    },
};

// ============================================================================
// API Methods
// ============================================================================

/**
 * Create a new Getnet checkout session
 */
export async function createGetnetCheckout(
    request: CreateCheckoutRequest
): Promise<CreateCheckoutResponse> {
    try {
        const response = await fetch(`${GETNET_API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        const data: CreateCheckoutResponse = await response.json();

        if (!response.ok || !data.success || !data.data) {
            return {
                success: false,
                error: data.error || 'No se pudo iniciar el proceso de pago',
            };
        }

        // Auto-save transaction data to sessionStorage
        getnetStorage.saveTransaction({
            transactionId: data.data.transactionId,
            orderUuid: data.data.orderUuid,
            vendureOrderCode: data.data.vendureOrderCode,
            cartCode: request.orderCode,
        });

        return data;
    } catch (error) {
        console.error('[Getnet API] Error creating checkout:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Get transaction status by transaction ID
 */
export async function getTransactionStatus(
    transactionId: string
): Promise<TransactionStatusResponse> {
    try {
        const response = await fetch(
            `${GETNET_API_BASE_URL}/transaction/${encodeURIComponent(transactionId)}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            }
        );

        const data: TransactionStatusResponse = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || 'No se pudo obtener el estado de la transacción',
            };
        }

        return data;
    } catch (error) {
        console.error('[Getnet API] Error fetching transaction status:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Get order status by order UUID (fallback when transactionId is not available)
 */
export async function getOrderStatus(
    orderUuid: string
): Promise<OrderStatusResponse> {
    try {
        const response = await fetch(
            `${GETNET_API_BASE_URL}/order/${encodeURIComponent(orderUuid)}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            }
        );

        const data: OrderStatusResponse = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || 'No se pudo obtener el estado de la orden',
            };
        }

        return data;
    } catch (error) {
        console.error('[Getnet API] Error fetching order status:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Fetch transaction status with fallback to order UUID
 * Tries transaction ID first, then falls back to order UUID
 */
export async function fetchTransactionWithFallback(): Promise<{
    transactionId: string | null;
    orderUuid: string | null;
    status: TransactionStatusResponse['data'] | null;
    error: string | null;
    source: 'transaction' | 'order' | null;
}> {
    const transactionId = getnetStorage.getTransactionId();
    const orderUuid = getnetStorage.getOrderUuid();
    const cartCode = getnetStorage.getCartCode();

    // Try transaction ID first
    if (transactionId) {
        const response = await getTransactionStatus(transactionId);
        if (response.success && response.data) {
            return {
                transactionId,
                orderUuid,
                status: response.data,
                error: null,
                source: 'transaction',
            };
        }
    }

    // Fallback to order UUID
    if (orderUuid) {
        const response = await getOrderStatus(orderUuid);
        if (response.success && response.data) {
            return {
                transactionId,
                orderUuid,
                status: {
                    transactionId: response.data.transactionId || transactionId || '',
                    orderUuid: response.data.orderUuid || orderUuid,
                    vendureOrderCode: response.data.vendureOrderCode || cartCode || '',
                    status: response.data.status as any,
                    providerStatus: response.data.providerStatus,
                    isTerminal: response.data.isTerminal || false,
                    webhookEventCount: response.data.webhookEventCount || 0,
                    approvedAt: response.data.approvedAt,
                    createdAt: response.data.createdAt || '',
                },
                error: null,
                source: 'order',
            };
        }
    }

    return {
        transactionId,
        orderUuid,
        status: null,
        error: 'No se encontró información de la transacción',
        source: null,
    };
}

/**
 * Build checkout URL with proper parameters
 */
export function buildCheckoutUrl(baseUrl: string, params?: {
    transactionId?: string;
    orderUuid?: string;
}): string {
    if (!params?.transactionId && !params?.orderUuid) {
        return baseUrl;
    }

    const url = new URL(baseUrl);
    if (params.transactionId) {
        url.searchParams.set('transaction_id', params.transactionId);
    }
    if (params.orderUuid) {
        url.searchParams.set('order_uuid', params.orderUuid);
    }
    return url.toString();
}
