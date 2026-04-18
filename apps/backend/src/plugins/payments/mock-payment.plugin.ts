import {
    CreatePaymentResult,
    LanguageCode,
    PaymentMethodHandler,
    PluginCommonModule,
    VendurePlugin,
} from '@vendure/core';

export const MOCK_PAYMENT_HANDLER_CODE = 'demo-payment';

export const mockPaymentHandler = new PaymentMethodHandler({
    code: MOCK_PAYMENT_HANDLER_CODE,
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Pago de demostración (aprobación simulada)',
        },
    ],
    args: {},
    createPayment: (_ctx, order, amount, _args, metadata): CreatePaymentResult => ({
        amount,
        state: 'Settled',
        transactionId: `demo-${order.code}-${Date.now()}`,
        metadata,
    }),
    settlePayment: () => ({ success: true }),
});

@VendurePlugin({
    imports: [PluginCommonModule],
})
export class MockPaymentPlugin {}
