import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { BadgeAdminResolver } from './badge.resolver';
import { badgeAdminApiExtensions, badgeShopApiExtensions } from './badge.schema';
import { BadgeService } from './badge.service';
import { Badge } from './badge.entity';
import { BadgeTemplate } from './badge-template.entity';
import { BadgeTemplateService } from './badge-template.service';
import { RelationalCustomFieldsSubscriber } from './relational-custom-fields.subscriber';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Badge, BadgeTemplate],
    providers: [BadgeService, BadgeTemplateService, RelationalCustomFieldsSubscriber],
    adminApiExtensions: {
        schema: badgeAdminApiExtensions,
        resolvers: [BadgeAdminResolver],
    },
    shopApiExtensions: {
        schema: badgeShopApiExtensions,
    },
})
export class BadgesPlugin {}
