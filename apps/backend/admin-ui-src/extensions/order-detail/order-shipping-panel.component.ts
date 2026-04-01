import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';

@Component({
    selector: 'cla-order-shipping-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="shipping$ | async as s">

        <!-- Sin envío seleccionado -->
        <div class="cla-alert cla-alert-warn" *ngIf="!s.methodLabel && !s.andreaniServiceName">
            ⚠️ El cliente todavía no seleccionó un método de envío.
        </div>

        <!-- Dirección del destinatario -->
        <div class="cla-section-title">Dirección de entrega</div>
        <div class="cla-address-block" *ngIf="s.address">
            <p>{{ s.address.fullName }}</p>
            <p>{{ s.address.streetLine1 }}<span *ngIf="s.address.streetLine2"> — {{ s.address.streetLine2 }}</span></p>
            <p>{{ s.address.city }}<span *ngIf="s.address.province">, {{ s.address.province }}</span></p>
            <p>CP {{ s.address.postalCode }} · {{ s.address.country }}</p>
        </div>
        <p *ngIf="!s.address" class="cla-empty-address">Sin dirección registrada.</p>

        <!-- Opción elegida -->
        <div class="cla-section-title" *ngIf="s.methodLabel || s.andreaniServiceName">Método de envío</div>
        <div class="cla-detail-grid" *ngIf="s.methodLabel || s.andreaniServiceName">
            <div class="cla-detail-row">
                <span class="cla-detail-label">Opción</span>
                <span>{{ s.methodLabel ?? s.andreaniServiceName ?? '—' }}</span>
            </div>
            <div class="cla-detail-row" *ngIf="s.priceCents != null">
                <span class="cla-detail-label">Costo de envío</span>
                <strong>{{ s.priceCents / 100 | currency:'ARS':'symbol':'1.2-2' }}</strong>
            </div>
        </div>

        <!-- Seguimiento -->
        <div class="cla-section-title" *ngIf="s.trackingNumber">Seguimiento</div>
        <div class="cla-detail-grid" *ngIf="s.trackingNumber">
            <div class="cla-detail-row">
                <span class="cla-detail-label">Número de tracking</span>
                <code class="cla-code">{{ s.trackingNumber }}</code>
            </div>
            <div class="cla-detail-row" *ngIf="s.shipmentStatus">
                <span class="cla-detail-label">Estado logístico</span>
                <span>{{ s.shipmentStatus }}</span>
            </div>
        </div>

        <!-- Sin despacho aún -->
        <div class="cla-info-notice" *ngIf="!s.trackingNumber && s.isPaid">
            ℹ️ El pedido todavía no fue despachado. El tracking estará disponible una vez que se genere el envío.
        </div>

    </ng-container>
    `,
    styles: [`
        .cla-section-title {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.07em; color: #6b7280; margin: 16px 0 8px;
        }
        .cla-address-block {
            background: #f9fafb; border-radius: 8px; padding: 12px 14px;
            line-height: 1.6; font-size: 14px; color: #374151;
        }
        .cla-address-block p { margin: 0; }
        .cla-empty-address { color: #9ca3af; font-size: 13px; }
        .cla-alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
        .cla-alert-warn { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
        .cla-detail-grid { display: grid; gap: 4px; }
        .cla-detail-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px;
        }
        .cla-detail-label { color: #6b7280; font-size: 13px; }
        .cla-code { font-family: monospace; font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .cla-info-notice { color: #6b7280; font-size: 13px; padding: 10px; background: #f9fafb; border-radius: 6px; margin-top: 12px; }
    `],
})
export class OrderShippingPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    shipping$!: Observable<any>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.shipping$ = this.entity$.pipe(
            switchMap(entity =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapStream(
                    (data: any) => {
                        const o = data.order;
                        const cf = o?.customFields ?? {};
                        const isPaid = ['PaymentAuthorized', 'PaymentSettled'].includes(o?.state);
                        return {
                            address: o?.shippingAddress ?? null,
                            // Mock logistics fields (new)
                            methodLabel: cf.shippingMethodLabel ?? null,
                            priceCents: cf.shippingPriceCents ?? null,
                            quoteCode: cf.shippingQuoteCode ?? null,
                            // Andreani real fields (existing)
                            andreaniServiceName: cf.andreaniServiceName ?? null,
                            andreaniPrice: cf.andreaniPrice ?? null,
                            trackingNumber: cf.andreaniTrackingNumber ?? null,
                            shipmentStatus: cf.andreaniShipmentStatus ?? null,
                            isPaid,
                        };
                    }
                )
            )
        );
    }
}
