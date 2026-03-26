import { LanguageCode } from '@vendure/core';
import { PaymentMethodHandler } from '@vendure/core';

/**
 * Getnet Payment Method Handler
 * 
 * This handler integrates Getnet with Vendure's payment system.
 * It handles the payment flow:
 * 1. User initiates checkout → creates Getnet order → redirects to Getnet
 * 2. User pays on Getnet → Getnet sends webhook → we process payment
 * 3. Payment is settled → order transitions to "PaymentSettled" state
 * 
 * Note: The actual payment is created in handleStatusTransition() when we receive
 * the webhook from Getnet confirming the payment.
 */
export const getnetPaymentHandler = new PaymentMethodHandler({
    code: 'getnet',
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Pago seguro con tarjeta a través de Getnet (Santander)',
        },
        {
            languageCode: LanguageCode.en,
            value: 'Secure payment with card through Getnet (Santander)',
        },
    ],
    
    /** This handler doesn't create payments directly - they're created via webhook */
    args: {},
    
    /** The actual payment creation happens when the webhook is received */
    createPayment: async (order, args, context) => {
        // This method is called by Vendure when creating a payment
        // For Getnet, payments are created via webhook, so this should not be called
        // If it is called, it means the flow is wrong
        throw new Error(
            'Getnet payments should be created via webhook after the customer completes payment on Getnet. ' +
            'Do not call this method directly.'
        );
    },
    
    /** Settlement is automatic via webhook - no manual settlement needed */
    settlePayment: async (order, payment, args, context) => {
        // Return success - actual payment was already recorded via webhook
        return {
            success: true,
        };
    },
});
