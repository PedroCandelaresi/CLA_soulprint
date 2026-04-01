import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { MockPaymentTransaction } from './mock-payment.entity';
import { MockPaymentService } from './mock-payment.service';
import { MockPaymentController } from './mock-payment.controller';

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    entities: [MockPaymentTransaction],
    controllers: [MockPaymentController],
    providers: [MockPaymentService],
})
export class MockPaymentsPlugin {}
