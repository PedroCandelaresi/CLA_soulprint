import { OrderService, RequestContextService } from '@vendure/core';
import type { Order } from '@vendure/core';
import { AndreaniSelectionPayload, AndreaniSelectionSnapshot } from './andreani.dto';

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

    private parseMetadata(value?: string | Record<string, unknown>): Record<string, unknown> | null {
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : { raw: value };
            } catch {
                return { raw: value };
            }
        }
        return value;
    }

    private buildSelectionSnapshot(order: Order, payload: AndreaniSelectionPayload): AndreaniSelectionSnapshot {
        return {
            orderCode: order.code,
            carrier: payload.carrier,
            quoteCode: payload.serviceCode,
            methodLabel: payload.serviceName,
            priceCents: payload.priceCents,
            currency: payload.currency,
            destinationPostalCode: payload.destinationPostalCode,
            destinationCity: payload.destinationCity,
            weightKg: payload.weightKg,
            heightCm: payload.heightCm,
            widthCm: payload.widthCm,
            lengthCm: payload.lengthCm,
            volume: payload.volume,
            providerMode: payload.providerMode || (payload.isSimulated ? 'mock' : 'real'),
            isSimulated: payload.isSimulated ?? payload.providerMode === 'mock',
            metadata: this.parseMetadata(payload.metadata),
            selectedAt: new Date().toISOString(),
        };
    }

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

        if (!Number.isInteger(payload.priceCents) || payload.priceCents < 0) {
            throw new Error('priceCents must be a non-negative integer for Andreani selection');
        }

        const snapshot = this.buildSelectionSnapshot(order, payload);

        const selection: Record<string, unknown> = {
            andreaniCarrier: payload.carrier,
            andreaniServiceCode: payload.serviceCode,
            andreaniServiceName: payload.serviceName,
            // TODO(migration): drop legacy andreaniPrice float column after all environments stop reading it.
            andreaniPrice: null,
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
            shippingQuoteCode: snapshot.quoteCode,
            shippingMethodLabel: snapshot.methodLabel,
            shippingPriceCents: snapshot.priceCents,
            shippingSnapshotJson: JSON.stringify(snapshot),
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
