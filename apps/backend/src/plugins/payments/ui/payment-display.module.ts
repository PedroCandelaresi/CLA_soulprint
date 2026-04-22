import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { PaymentDisplaySettingsComponent } from './components/payment-display-settings/payment-display-settings.component';
import { paymentDisplayRoutes } from './routes';

@NgModule({
    imports: [SharedModule, RouterModule.forChild(paymentDisplayRoutes)],
    declarations: [PaymentDisplaySettingsComponent],
})
export class PaymentDisplayModule {}
