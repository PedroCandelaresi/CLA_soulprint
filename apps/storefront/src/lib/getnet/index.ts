/**
 * Getnet Checkout Integration
 * 
 * This module provides a complete integration layer for Getnet Checkout
 * (Santander / GeoPagos) payment processing.
 * 
 * @example
 * ```typescript
 * import { createGetnetCheckout, getTransactionStatus } from '@/lib/getnet';
 * 
 * // Create checkout
 * const response = await createGetnetCheckout({
 *   orderCode: 'ORDER-001',
 *   items: [{ id: '1', name: 'Product', quantity: 1, unitPrice: 1000 }]
 * });
 * 
 * if (response.success && response.data) {
 *   // Redirect to response.data.checkoutUrl
 * }
 * ```
 */

// Re-export all client functions
export {
    createGetnetCheckout,
    getTransactionStatus,
    getOrderStatus,
    fetchTransactionWithFallback,
    getnetStorage,
    buildCheckoutUrl,
} from './client';

// Re-export types
export type {
    GetnetCheckoutItem,
    CreateCheckoutRequest,
    CreateCheckoutResponse,
    CheckoutData,
    TransactionStatus,
    TransactionStatusValue,
    TransactionStatusResponse,
    OrderStatusResponse,
    StatusDisplayConfig,
} from '@/types/getnet';

// Re-export constants
export { GETNET_STORAGE_KEYS, STATUS_DISPLAY_MAP } from '@/types/getnet';
