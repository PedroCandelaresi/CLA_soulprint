import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { MockLogisticsController } from './mock-logistics.controller';
import { MockLogisticsService } from './mock-logistics.service';

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    controllers: [MockLogisticsController],
    providers: [MockLogisticsService],
})
export class MockLogisticsPlugin {}
