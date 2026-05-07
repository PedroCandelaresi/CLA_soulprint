import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { HealthController } from './health.controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [HealthController],
})
export class ClaHealthPlugin {}
