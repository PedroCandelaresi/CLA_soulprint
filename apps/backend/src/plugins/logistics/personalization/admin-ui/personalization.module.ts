import { NgModule } from '@angular/core';
import { gql } from '@apollo/client/core';
import { SharedModule, registerCustomDetailComponent } from '@vendure/admin-ui/core';
import { OrderPersonalizationPanelComponent } from './order-personalization-panel.component';

export const ORDER_PERSONALIZATION_QUERY = gql`
    query GetOrderPersonalization($id: ID!) {
        order(id: $id) {
            id
            lines {
                id
                quantity
                productVariant {
                    id name sku
                    product { name }
                    customFields { requiresPersonalization }
                }
                customFields {
                    frontMode
                    frontText
                    backMode
                    backText
                    personalizationStatus
                    personalizationNotes
                    personalizationUploadedAt
                    personalizationApprovedAt
                    personalizationSnapshotFileName
                    personalizationAsset {
                        id preview source mimeType fileSize
                    }
                    personalizationBackStatus
                    personalizationBackUploadedAt
                    personalizationBackSnapshotFileName
                    personalizationBackAsset {
                        id preview source mimeType fileSize
                    }
                }
            }
            customFields {
                personalizationOverallStatus
            }
        }
    }
`;

@NgModule({
    imports: [SharedModule],
    declarations: [OrderPersonalizationPanelComponent],
    providers: [
        registerCustomDetailComponent({
            locationId: 'order-detail',
            component: OrderPersonalizationPanelComponent,
        }),
    ],
})
export class OrderPersonalizationModule {}
