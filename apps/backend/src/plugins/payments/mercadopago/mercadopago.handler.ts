import {
    CreatePaymentErrorResult,
    CreatePaymentResult,
    Injector,
    LanguageCode,
    PaymentMethodHandler,
} from '@vendure/core';
import { MercadoPagoService } from './mercadopago.service';

export const MERCADOPAGO_PAYMENT_HANDLER_CODE = 'mercadopago';

let mercadoPagoService: MercadoPagoService;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export const mercadopagoPaymentHandler = new PaymentMethodHandler({
    code: MERCADOPAGO_PAYMENT_HANDLER_CODE,
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Mercado Pago Checkout Pro',
        },
    ],
    args: {},
    init(injector: Injector) {
        mercadoPagoService = injector.get(MercadoPagoService);
    },
    createPayment: async (_ctx, order, amount, _args, metadata): Promise<CreatePaymentResult | CreatePaymentErrorResult> => {
        if (!mercadoPagoService) {
            return {
                amount,
                state: 'Error',
                errorMessage: 'Mercado Pago service is not initialized.',
            };
        }

        try {
            const metadataInput = isRecord(metadata) ? metadata : {};
            const retryCount =
                typeof metadataInput.retryCount === 'number' ? metadataInput.retryCount : 0;
            const retriedFromPaymentId =
                typeof metadataInput.retriedFromPaymentId === 'string'
                    ? metadataInput.retriedFromPaymentId
                    : undefined;
            const { preference, paymentMetadata } = await mercadoPagoService.createPreference(order, amount, {
                retryCount,
                retriedFromPaymentId,
            });

            return {
                amount,
                state: 'Authorized',
                transactionId: `mp-pref-${preference.id}`,
                metadata: {
                    ...paymentMetadata,
                    ...(retryCount > 0 ? { retryCount } : {}),
                    ...(retriedFromPaymentId ? { retriedFromPaymentId } : {}),
                },
            };
        } catch (error) {
            return {
                amount,
                state: 'Error',
                errorMessage: mercadoPagoService.getErrorMessage(
                    error,
                    'No se pudo iniciar el checkout de Mercado Pago.',
                ),
            };
        }
    },
    settlePayment: async () => ({
        success: true,
    }),
    cancelPayment: async () => ({
        success: true,
    }),
});
