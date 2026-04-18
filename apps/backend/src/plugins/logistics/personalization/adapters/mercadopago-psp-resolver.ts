import { Injectable, Optional } from '@nestjs/common';
import { MercadoPagoService } from '../../../payments/mercadopago/mercadopago.service';
import type { PersonalizationPspResolver, PersonalizationPspTransaction } from './psp-resolver';

/**
 * Resolves a Mercado Pago payment id to its Vendure order code
 * so the personalization authorize() path can validate access via
 * a post-payment `transactionId` querystring.
 */
@Injectable()
export class MercadoPagoPersonalizationPspResolver implements PersonalizationPspResolver {
    constructor(@Optional() private readonly mercadoPagoService?: MercadoPagoService) {}

    async findTransactionById(transactionId: string): Promise<PersonalizationPspTransaction | null> {
        if (!this.mercadoPagoService || !transactionId) {
            return null;
        }
        try {
            const payment = await this.mercadoPagoService.fetchPayment(transactionId);
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
}
