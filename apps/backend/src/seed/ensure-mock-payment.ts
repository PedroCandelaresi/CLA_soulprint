import { LanguageCode, PaymentMethodService, RequestContextService } from '@vendure/core';
import { MOCK_PAYMENT_HANDLER_CODE } from '../plugins/payments/mock-payment.plugin';

const DEMO_PAYMENT_METHOD_CODE = 'demo-payment';

export async function ensureMockPaymentMethod(app: {
    get<T>(token: new (...args: never[]) => T): T;
}): Promise<void> {
    const requestContextService = app.get(RequestContextService);
    const paymentMethodService = app.get(PaymentMethodService);

    try {
        const ctx = await requestContextService.create({ apiType: 'admin' });

        const existing = await paymentMethodService.findAll(ctx, {
            filter: { code: { eq: DEMO_PAYMENT_METHOD_CODE } },
            take: 1,
        });

        if (existing.totalItems > 0) {
            return;
        }

        await paymentMethodService.create(ctx, {
            code: DEMO_PAYMENT_METHOD_CODE,
            enabled: true,
            handler: {
                code: MOCK_PAYMENT_HANDLER_CODE,
                arguments: [],
            },
            translations: [
                {
                    languageCode: LanguageCode.es,
                    name: 'Pago Demo',
                    description: 'Método de pago simulado para la demostración comercial. Siempre aprobado.',
                    customFields: {},
                },
            ],
            customFields: {},
        });

        console.log('[ensureMockPaymentMethod] Payment method "demo-payment" created.');
    } catch (error) {
        console.warn('[ensureMockPaymentMethod] Could not ensure payment method (continuing):', error);
    }
}
