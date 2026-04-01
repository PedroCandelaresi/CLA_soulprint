import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';
import { buildOrderDashboard, getToneClass, OrderDashboardViewModel } from './order-detail.helpers';

@Component({
    selector: 'cla-order-overview-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="overview$ | async as vm">
        <section class="cla-overview-shell">
            <header class="cla-overview-header">
                <div>
                    <p class="cla-eyebrow">Resumen del pedido</p>
                    <h3 class="cla-title">Información clave para operar sin revisar pantallas técnicas</h3>
                </div>
                <div class="cla-overview-order-pill">
                    <span class="cla-order-pill__label">Pedido</span>
                    <strong>{{ vm.code }}</strong>
                </div>
            </header>

            <div class="cla-overview-grid">
                <article class="cla-info-card cla-info-card--wide">
                    <div class="cla-info-card__header">
                        <div>
                            <p class="cla-card-label">Cliente</p>
                            <h4>{{ vm.customerName || 'Compra sin cuenta registrada' }}</h4>
                        </div>
                        <span class="cla-state-chip" [ngClass]="getToneClass(vm.businessStatusTone)">
                            {{ vm.businessStatusLabel }}
                        </span>
                    </div>

                    <div class="cla-detail-list">
                        <div class="cla-detail-row" *ngIf="vm.customerEmail">
                            <span>Email de contacto</span>
                            <strong>{{ vm.customerEmail }}</strong>
                        </div>
                        <div class="cla-detail-row" *ngIf="vm.customerPhone">
                            <span>Teléfono</span>
                            <strong>{{ vm.customerPhone }}</strong>
                        </div>
                        <div class="cla-detail-row">
                            <span>Total</span>
                            <strong>{{ vm.totalWithTax / 100 | currency:vm.currencyCode:'symbol':'1.2-2' }}</strong>
                        </div>
                        <div class="cla-detail-row" *ngIf="vm.createdAt">
                            <span>Ingresó el</span>
                            <strong>{{ vm.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong>
                        </div>
                    </div>
                </article>

                <article class="cla-info-card">
                    <p class="cla-card-label">Pago</p>
                    <h4>{{ vm.paymentLabel }}</h4>
                    <p class="cla-card-copy">{{ vm.paymentDescription }}</p>
                    <div class="cla-mini-meta">
                        <span *ngIf="vm.paymentMethod">Método: {{ vm.paymentMethod }}</span>
                        <span *ngIf="vm.paymentAmount != null">Cobrado: {{ vm.paymentAmount / 100 | currency:vm.currencyCode:'symbol':'1.2-2' }}</span>
                    </div>
                </article>

                <article class="cla-info-card">
                    <p class="cla-card-label">Personalización</p>
                    <h4>{{ vm.personalizationLabel }}</h4>
                    <p class="cla-card-copy">{{ vm.personalizationDescription }}</p>
                    <div class="cla-mini-meta" *ngIf="vm.personalizationRequired">
                        <span>Con imagen: {{ vm.personalizationCompletedCount }}/{{ vm.personalizationRequiredCount }}</span>
                        <span *ngIf="vm.latestAssetFileName">Último archivo: {{ vm.latestAssetFileName }}</span>
                    </div>
                </article>

                <article class="cla-info-card">
                    <p class="cla-card-label">Envío</p>
                    <h4>{{ vm.shippingLabel }}</h4>
                    <p class="cla-card-copy">{{ vm.shippingDescription }}</p>
                    <div class="cla-mini-meta">
                        <span *ngIf="vm.shippingMethodLabel">{{ vm.shippingMethodLabel }}</span>
                        <span *ngIf="vm.trackingNumber">Tracking: {{ vm.trackingNumber }}</span>
                    </div>
                </article>
            </div>

            <section class="cla-overview-address" *ngIf="vm.shippingAddress.length > 0">
                <p class="cla-card-label">Dirección de entrega</p>
                <div class="cla-address-lines">
                    <div *ngFor="let line of vm.shippingAddress">{{ line }}</div>
                </div>
            </section>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-overview-shell {
            display: grid;
            gap: 16px;
            padding: 18px;
            border: 1px solid var(--brand-border);
            border-radius: 18px;
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(251, 248, 241, 0.98)),
                var(--brand-surface-alt);
            box-shadow: 0 18px 36px -28px var(--brand-shadow-strong);
        }
        .cla-overview-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }
        .cla-eyebrow {
            margin: 0 0 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--brand-text-soft);
            font-weight: 700;
        }
        .cla-title {
            margin: 0;
            font-size: 20px;
            line-height: 1.2;
            color: var(--brand-primary-strong);
        }
        .cla-overview-order-pill {
            min-width: 140px;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--brand-primary-soft);
            border: 1px solid var(--brand-border);
            color: var(--brand-primary-strong);
        }
        .cla-order-pill__label {
            display: block;
            margin-bottom: 2px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--brand-text-muted);
        }
        .cla-overview-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
        }
        .cla-info-card {
            display: grid;
            gap: 10px;
            min-width: 0;
            padding: 16px;
            border-radius: 16px;
            border: 1px solid var(--brand-border);
            background: rgba(255, 255, 255, 0.82);
        }
        .cla-info-card--wide {
            grid-column: span 2;
        }
        .cla-info-card__header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
        .cla-card-label {
            margin: 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--brand-text-soft);
            font-weight: 700;
        }
        .cla-info-card h4 {
            margin: 4px 0 0;
            font-size: 17px;
            line-height: 1.25;
            color: var(--brand-primary-strong);
        }
        .cla-card-copy {
            margin: 0;
            color: var(--brand-text-muted);
            line-height: 1.45;
        }
        .cla-detail-list {
            display: grid;
            gap: 8px;
        }
        .cla-detail-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding-top: 8px;
            border-top: 1px solid var(--brand-border);
            color: var(--brand-text-muted);
        }
        .cla-detail-row strong {
            color: var(--brand-text);
            text-align: right;
        }
        .cla-mini-meta {
            display: grid;
            gap: 4px;
            color: var(--brand-text-muted);
            font-size: 13px;
        }
        .cla-overview-address {
            display: grid;
            gap: 8px;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1px dashed var(--brand-border-strong);
            background: rgba(255, 255, 255, 0.65);
        }
        .cla-address-lines {
            display: grid;
            gap: 2px;
            color: var(--brand-text);
        }
        .cla-state-chip {
            display: inline-flex;
            align-items: center;
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

        @media (max-width: 1200px) {
            .cla-overview-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .cla-info-card--wide {
                grid-column: span 2;
            }
        }
        @media (max-width: 768px) {
            .cla-overview-header {
                flex-direction: column;
            }
            .cla-overview-grid {
                grid-template-columns: 1fr;
            }
            .cla-info-card--wide {
                grid-column: span 1;
            }
        }
    `],
})
export class OrderOverviewPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    overview$!: Observable<OrderDashboardViewModel>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.overview$ = this.entity$.pipe(
            switchMap((entity) =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildOrderDashboard(data.order),
                ),
            ),
        );
    }

    getToneClass = getToneClass;
}
