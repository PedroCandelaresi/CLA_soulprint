import { NgModule } from '@angular/core';
import {
    DataService,
    NotificationService,
    SharedModule,
    registerCustomDetailComponent,
} from '@vendure/admin-ui/core';

import { OrderStatusBannerComponent } from './order-status-banner.component';
import { OrderPersonalizationPanelComponent } from './order-personalization-panel.component';
import { OrderPaymentPanelComponent } from './order-payment-panel.component';
import { OrderShippingPanelComponent } from './order-shipping-panel.component';
import { OrderActionsComponent } from './order-actions.component';

// ── Inline GraphQL query ──────────────────────────────────────────────────────
// Loaded once; each component subscribes to the stream from DataService.
export const ORDER_DASHBOARD_QUERY = `
    query GetOrderDashboard($id: ID!) {
        order(id: $id) {
            id
            code
            state
            totalWithTax
            currencyCode
            createdAt
            customer { firstName lastName emailAddress }
            shippingAddress {
                fullName streetLine1 streetLine2 city province postalCode country
            }
            payments {
                id state transactionId amount method
                metadata
            }
            lines {
                id
                quantity
                unitPriceWithTax
                productVariant {
                    id name sku
                    product { name }
                    customFields { requiresPersonalization }
                }
                customFields {
                    personalizationStatus
                    personalizationNotes
                    personalizationUploadedAt
                    personalizationApprovedAt
                    personalizationSnapshotFileName
                    personalizationAsset {
                        id preview source mimeType fileSize
                    }
                }
            }
            customFields {
                productionStatus
                productionUpdatedAt
                personalizationOverallStatus
                shippingQuoteCode
                shippingMethodLabel
                shippingPriceCents
                shippingSnapshotJson
                andreaniTrackingNumber
                andreaniShipmentStatus
                andreaniServiceName
                buyerFullName
                buyerEmail
                buyerPhone
            }
        }
    }
`;

@NgModule({
    imports: [SharedModule],
    declarations: [
        OrderStatusBannerComponent,
        OrderPersonalizationPanelComponent,
        OrderPaymentPanelComponent,
        OrderShippingPanelComponent,
        OrderActionsComponent,
    ],
    providers: [
        // Slots de extensión en la pantalla de detalle de orden de Vendure
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderStatusBannerComponent,
            tab: 'Resumen operativo',
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderPersonalizationPanelComponent,
            tab: 'Personalización',
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderPaymentPanelComponent,
            tab: 'Pago',
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderShippingPanelComponent,
            tab: 'Envío',
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderActionsComponent,
            tab: 'Resumen operativo',
        }),
    ],
})
export class OrderDetailExtensionModule {}
