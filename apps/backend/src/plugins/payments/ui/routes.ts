import { Route } from '@angular/router';
import { PaymentDisplaySettingsComponent } from './components/payment-display-settings/payment-display-settings.component';

export const paymentDisplayRoutes: Route[] = [
    { path: '', pathMatch: 'full', component: PaymentDisplaySettingsComponent },
];
