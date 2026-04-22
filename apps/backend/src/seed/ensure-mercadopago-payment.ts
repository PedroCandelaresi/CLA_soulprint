import { LanguageCode, PaymentMethodService, RequestContextService } from '@vendure/core';
import { MERCADOPAGO_PAYMENT_HANDLER_CODE } from '../plugins/payments/mercadopago/mercadopago.handler';

const MERCADOPAGO_PAYMENT_METHOD_CODE = 'mercadopago';
const LEGACY_DEMO_PAYMENT_METHOD_CODE = 'demo-payment';

function getMercadoPagoPaymentMethodInput() {
    return {
        enabled: true,
        handler: {
            code: MERCADOPAGO_PAYMENT_HANDLER_CODE,
            arguments: [],
        },
        translations: [
            {
                languageCode: LanguageCode.es,
                name: 'Mercado Pago',
                description: 'Checkout Pro de Mercado Pago con confirmación final por webhook.',
                customFields: {},
            },
        ],
        customFields: {},
    };
}

export async function ensureMercadoPagoPaymentMethod(app: {
    get<T>(token: new (...args: never[]) => T): T;
}): Promise<void> {
    const requestContextService = app.get(RequestContextService);
    const paymentMethodService = app.get(PaymentMethodService);

    try {
        const ctx = await requestContextService.create({ apiType: 'admin' });

        const existingMercadoPago = await paymentMethodService.findAll(ctx, {
            filter: { code: { eq: MERCADOPAGO_PAYMENT_METHOD_CODE } },
            take: 1,
        });

        if (existingMercadoPago.totalItems > 0) {
            const mercadopagoMethod = existingMercadoPago.items[0];

            await paymentMethodService.update(ctx, {
                id: mercadopagoMethod.id,
                enabled: true,
                handler: {
                    code: MERCADOPAGO_PAYMENT_HANDLER_CODE,
                    arguments: [],
                },
            });
        } else {
            await paymentMethodService.create(ctx, {
                code: MERCADOPAGO_PAYMENT_METHOD_CODE,
                ...getMercadoPagoPaymentMethodInput(),
            });
        }

        const legacyDemoPayment = await paymentMethodService.findAll(ctx, {
            filter: { code: { eq: LEGACY_DEMO_PAYMENT_METHOD_CODE } },
            take: 1,
        });

        if (legacyDemoPayment.totalItems > 0) {
            const legacyMethod = legacyDemoPayment.items[0];

            await paymentMethodService.update(ctx, {
                id: legacyMethod.id,
                enabled: false,
            });
        }

        console.log('[ensureMercadoPagoPaymentMethod] Payment method "mercadopago" ensured.');
    } catch (error) {
        console.warn(
            '[ensureMercadoPagoPaymentMethod] Could not ensure Mercado Pago payment method (continuing):',
            error,
        );
    }
}
