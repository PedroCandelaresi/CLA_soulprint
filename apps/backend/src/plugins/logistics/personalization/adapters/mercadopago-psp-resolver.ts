import { Injectable, Optional } from '@nestjs/common';
import { MercadoPagoService } from '../../../payments/mercadopago/mercadopago.service';
import type { PersonalizationPspResolver, PersonalizationPspTransaction } from './psp-resolver';

const MERCADOPAGO_API_BASE_URL = 'https://api.mercadopago.com';

type MercadoPagoPaymentLike = {
    external_reference?: unknown;
    status?: unknown;
};

/**
 * Resolves a Mercado Pago payment id to its Vendure order code
 * so the personalization authorize() path can validate access via
 * a post-payment `transactionId` querystring.
 */
@Injectable()
export class MercadoPagoPersonalizationPspResolver implements PersonalizationPspResolver {
    constructor(@Optional() private readonly mercadoPagoService?: MercadoPagoService) {}

    async findTransactionById(transactionId: string): Promise<PersonalizationPspTransaction | null> {
        if (!transactionId) {
            return null;
        }
        try {
            const payment = await this.fetchPayment(transactionId);
            const vendureOrderCode = payment?.external_reference?.toString().trim();
            const status = payment?.status?.toString().trim();
            if (!vendureOrderCode || !status) {
                return null;
            }
            return { vendureOrderCode, status };
        } catch {
            return null;
        }
    }

    private async fetchPayment(transactionId: string): Promise<MercadoPagoPaymentLike | null> {
        if (this.mercadoPagoService) {
            return this.mercadoPagoService.fetchPayment(transactionId);
        }

        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
        if (!accessToken) {
            return null;
        }

        const response = await fetch(
            `${MERCADOPAGO_API_BASE_URL}/v1/payments/${encodeURIComponent(transactionId)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as MercadoPagoPaymentLike;
    }
}
