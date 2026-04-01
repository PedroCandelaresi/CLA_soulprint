import { NgModule } from '@angular/core';
import { gql } from '@apollo/client/core';
import {
    SharedModule,
    registerCustomDetailComponent,
} from '@vendure/admin-ui/core';

import { OrderStatusBannerComponent } from './order-status-banner.component';
import { OrderOverviewPanelComponent } from './order-overview-panel.component';
import { OrderPersonalizationPanelComponent } from './order-personalization-panel.component';
import { OrderPaymentPanelComponent } from './order-payment-panel.component';
import { OrderShippingPanelComponent } from './order-shipping-panel.component';
import { OrderActionsComponent } from './order-actions.component';

// ── Inline GraphQL query ──────────────────────────────────────────────────────
// Loaded once; each component subscribes to the stream from DataService.
export const ORDER_DASHBOARD_QUERY = gql`
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
        OrderOverviewPanelComponent,
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
            component: OrderOverviewPanelComponent,
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderStatusBannerComponent,
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderPersonalizationPanelComponent,
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderPaymentPanelComponent,
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderShippingPanelComponent,
        }),
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderActionsComponent,
        }),
    ],
})
export class OrderDetailExtensionModule {}
