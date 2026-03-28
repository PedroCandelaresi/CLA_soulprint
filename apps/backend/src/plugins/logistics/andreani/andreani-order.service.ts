import { OrderService, RequestContextService } from '@vendure/core';
import type { Order } from '@vendure/core';
import { AndreaniSelectionPayload } from './andreani.dto';

export class AndreaniOrderService {
    constructor(
        private orderService: OrderService,
        private requestContextService: RequestContextService,
    ) {}

    private buildMetadata(value?: string | Record<string, unknown>): string | undefined {
        if (!value) {
            return undefined;
        }
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return undefined;
        }
    }

    private static readonly ALLOWED_STATES = ['ArrangingPayment', 'PaymentSettled', 'PaymentAuthorized'];

    async persistSelection(payload: AndreaniSelectionPayload): Promise<Order> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = payload.orderId
            ? await this.orderService.findOne(ctx, payload.orderId)
            : payload.orderCode
                ? await this.orderService.findOneByCode(ctx, payload.orderCode)
                : null;

        if (!order) {
            throw new Error('Order not found for Andreani selection');
        }

        if (!AndreaniOrderService.ALLOWED_STATES.includes(order.state)) {
            throw new Error(`Order in state ${order.state} cannot accept Andreani selection`);
        }

        const selection: Record<string, unknown> = {
            andreaniCarrier: payload.carrier,
            andreaniServiceCode: payload.serviceCode,
            andreaniServiceName: payload.serviceName,
            andreaniPrice: payload.price,
            andreaniCurrency: payload.currency,
            andreaniDestinationPostalCode: payload.destinationPostalCode,
            andreaniDestinationCity: payload.destinationCity,
            andreaniSelectionMetadata: this.buildMetadata(payload.metadata),
            andreaniWeightKg: payload.weightKg,
            andreaniDimensions: this.buildMetadata({
                heightCm: payload.heightCm,
                widthCm: payload.widthCm,
                lengthCm: payload.lengthCm,
                volume: payload.volume,
            }),
        };

        return this.orderService.updateCustomFields(ctx, order.id, selection);
    }

    async getLogistics(orderCode: string): Promise<Record<string, unknown> | null> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.orderService.findOneByCode(ctx, orderCode);
        if (!order) {
            return null;
        }
        return (order.customFields as Record<string, unknown>) || null;
    }
}
