import {
    CreatePaymentResult,
    LanguageCode,
    PaymentMethodHandler,
    PluginCommonModule,
    VendurePlugin,
} from '@vendure/core';

export const TRANSFERENCIA_PAYMENT_CODE = 'transferencia-bancaria';

/**
 * Pago por efectivo o transferencia bancaria.
 * El pago queda en estado Authorized hasta que el administrador confirme
 * la acreditación y lo mueva manualmente a Settled.
 */
export const transferenciaPaymentHandler = new PaymentMethodHandler({
    code: TRANSFERENCIA_PAYMENT_CODE,
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Efectivo / Transferencia bancaria',
        },
    ],
    args: {},
    createPayment: (_ctx, _order, amount, _args, metadata): CreatePaymentResult => ({
        amount,
        state: 'Authorized',
        transactionId: `transferencia-${Date.now()}`,
        metadata,
    }),
    settlePayment: () => ({ success: true }),
});

@VendurePlugin({
    imports: [PluginCommonModule],
})
export class TransferenciaPaymentPlugin {}
