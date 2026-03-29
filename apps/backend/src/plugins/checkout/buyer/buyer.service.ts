import { Injectable } from '@nestjs/common';
import { OrderService, RequestContext } from '@vendure/core';

@Injectable()
export class BuyerCheckoutService {
    constructor(private readonly orderService: OrderService) {}

    async updateActiveOrderBuyer(
        ctx: RequestContext,
        activeOrderId: string,
        input: {
            fullName: string;
            email: string;
            phone: string;
        },
    ) {
        const order = await this.orderService.findOne(ctx, activeOrderId);
        if (!order) {
            throw new Error('No hay una orden activa.');
        }

        await this.orderService.updateCustomFields(ctx, order.id, {
            buyerFullName: input.fullName,
            buyerEmail: input.email,
            buyerPhone: input.phone,
        });

        const updatedOrder = await this.orderService.findOne(ctx, order.id);
        if (!updatedOrder) {
            throw new Error('No se pudo recargar la orden activa.');
        }

        const customFields = (updatedOrder.customFields || {}) as Record<string, unknown>;

        return {
            orderCode: updatedOrder.code,
            buyer: {
                fullName: typeof customFields.buyerFullName === 'string' ? customFields.buyerFullName : null,
                email: typeof customFields.buyerEmail === 'string' ? customFields.buyerEmail : null,
                phone: typeof customFields.buyerPhone === 'string' ? customFields.buyerPhone : null,
            },
        };
    }
}
