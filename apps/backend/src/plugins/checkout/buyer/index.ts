import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { BuyerCheckoutController } from './buyer.controller';
import { BuyerCheckoutService } from './buyer.service';

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    controllers: [BuyerCheckoutController],
    providers: [BuyerCheckoutService],
})
export class BuyerCheckoutPlugin {}

export * from './buyer.controller';
export * from './buyer.service';
