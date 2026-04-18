import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { MercadoPagoController } from './mercadopago.controller';
import { MercadoPagoResolver } from './mercadopago.resolver';
import { MercadoPagoService } from './mercadopago.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [MercadoPagoController],
    shopApiExtensions: {
        schema: gql`
            extend type Mutation {
                retryMercadoPagoPayment(orderCode: String!, force: Boolean = false): Order!
            }
        `,
        resolvers: [MercadoPagoResolver],
    },
    providers: [MercadoPagoService],
})
export class MercadoPagoPlugin {}
