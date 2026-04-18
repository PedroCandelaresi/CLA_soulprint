import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
    Allow,
    ConfigService,
    Ctx,
    Order,
    OrderService,
    Permission,
    RequestContext,
    UserInputError,
} from '@vendure/core';
import { MercadoPagoService } from './mercadopago.service';

@Resolver()
export class MercadoPagoResolver {
    constructor(
        private readonly configService: ConfigService,
        private readonly orderService: OrderService,
        private readonly mercadoPagoService: MercadoPagoService,
    ) {}

    @Mutation()
    @Allow(Permission.Public)
    async retryMercadoPagoPayment(
        @Ctx() ctx: RequestContext,
        @Args('orderCode') orderCode: string,
        @Args('force', { type: () => Boolean }) force: boolean = false,
    ): Promise<Order> {
        const normalizedOrderCode = orderCode.trim();

        if (!normalizedOrderCode) {
            throw new UserInputError('Necesitamos un código de pedido válido para reintentar el pago.');
        }

        const order = await this.orderService.findOneByCode(ctx, normalizedOrderCode);

        if (!order) {
            throw new UserInputError('No encontramos el pedido indicado para reintentar el pago.');
        }

        const canAccessOrder =
            await this.configService.orderOptions.orderByCodeAccessStrategy.canAccessOrder(
                ctx,
                order,
            );

        if (!canAccessOrder) {
            throw new UserInputError('No pudimos validar el acceso al pedido solicitado.');
        }

        return this.mercadoPagoService.retryOrderPayment(ctx, order, { force });
    }
}
