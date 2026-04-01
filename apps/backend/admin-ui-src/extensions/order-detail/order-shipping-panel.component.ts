import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';
import { buildOrderDashboard, getToneClass, OrderDashboardViewModel } from './order-detail.helpers';

@Component({
    selector: 'cla-order-shipping-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="shipping$ | async as vm">
        <section class="cla-panel">
            <header class="cla-panel__header">
                <div>
                    <p class="cla-panel__eyebrow">Envío</p>
                    <h3>{{ vm.shippingLabel }}</h3>
                </div>
                <span class="cla-status-pill" [ngClass]="getToneClass(vm.shippingTone)">
                    {{ vm.trackingNumber ? 'Con tracking' : (vm.shippingMethodLabel ? 'Definido' : 'Pendiente') }}
                </span>
            </header>

            <p class="cla-panel__copy">{{ vm.shippingDescription }}</p>

            <div class="cla-alert cla-alert--warning" *ngIf="!vm.shippingMethodLabel">
                El pedido todavía no muestra una opción de envío guardada.
            </div>

            <div class="cla-grid">
                <article class="cla-card">
                    <span class="cla-card__label">Dirección de entrega</span>
                    <div class="cla-address" *ngIf="vm.shippingAddress.length > 0; else noAddress">
                        <div *ngFor="let line of vm.shippingAddress">{{ line }}</div>
                    </div>
                    <ng-template #noAddress>
                        <div class="cla-empty">Sin dirección registrada</div>
                    </ng-template>
                </article>

                <article class="cla-card">
                    <span class="cla-card__label">Opción elegida</span>
                    <strong>{{ vm.shippingMethodLabel || 'Todavía no definida' }}</strong>
                    <span *ngIf="vm.shippingPriceCents != null">
                        {{ vm.shippingPriceCents / 100 | currency:'ARS':'symbol':'1.2-2' }}
                    </span>
                    <span *ngIf="vm.shipmentStatus">Estado logístico: {{ vm.shipmentStatus }}</span>
                    <span *ngIf="vm.trackingNumber">Tracking: {{ vm.trackingNumber }}</span>
                </article>
            </div>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-panel {
            display: grid;
            gap: 14px;
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--brand-border);
            background: rgba(255, 255, 255, 0.9);
        }
        .cla-panel__header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
        }
        .cla-panel__eyebrow {
            margin: 0 0 4px;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--brand-text-soft);
        }
        .cla-panel h3 {
            margin: 0;
            color: var(--brand-primary-strong);
            font-size: 21px;
        }
        .cla-panel__copy {
            margin: 0;
            color: var(--brand-text-muted);
            line-height: 1.5;
        }
        .cla-status-pill {
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
        }
        .cla-tone-neutral { background: var(--brand-surface-muted); color: var(--brand-text-muted); }
        .cla-tone-info { background: rgba(0, 72, 37, 0.1); color: var(--brand-primary); }
        .cla-tone-success { background: var(--color-success-150); color: var(--brand-success); }
        .cla-tone-warning { background: var(--color-warning-150); color: var(--brand-warning); }
        .cla-tone-danger { background: var(--color-error-150); color: var(--brand-error); }
        .cla-alert {
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 14px;
        }
        .cla-alert--warning {
            background: var(--color-warning-150);
            color: var(--brand-warning);
            border: 1px solid #ecd08a;
        }
        .cla-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .cla-card {
            display: grid;
            gap: 8px;
            padding: 14px;
            border-radius: 14px;
            border: 1px solid var(--brand-border);
            background: var(--brand-surface-alt);
        }
        .cla-card__label {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--brand-text-soft);
            font-weight: 700;
        }
        .cla-card strong {
            color: var(--brand-text);
        }
        .cla-card span,
        .cla-address {
            color: var(--brand-text-muted);
            line-height: 1.45;
        }
        .cla-empty {
            color: var(--brand-text-soft);
        }
        @media (max-width: 720px) {
            .cla-panel__header {
                flex-direction: column;
            }
            .cla-grid {
                grid-template-columns: 1fr;
            }
        }
    `],
})
export class OrderShippingPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    shipping$!: Observable<OrderDashboardViewModel>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.shipping$ = this.entity$.pipe(
            switchMap((entity) =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildOrderDashboard(data.order),
                ),
            ),
        );
    }

    getToneClass = getToneClass;
}
