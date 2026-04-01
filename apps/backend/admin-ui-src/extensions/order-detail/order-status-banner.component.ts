import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';
import { buildOrderDashboard, getToneClass, OrderDashboardViewModel } from './order-detail.helpers';

@Component({
    selector: 'cla-order-status-banner',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="vm$ | async as vm">
        <section class="cla-banner" [ngClass]="getToneClass(vm.businessStatusTone)">
            <div class="cla-banner__marker"></div>
            <div class="cla-banner__body">
                <p class="cla-banner__eyebrow">Estado general del pedido</p>
                <h3 class="cla-banner__title">{{ vm.businessStatusLabel }}</h3>
                <p class="cla-banner__copy">{{ vm.businessStatusDescription }}</p>
            </div>
            <div class="cla-banner__aside">
                <div class="cla-banner__pill">
                    <span>Producción</span>
                    <strong>{{ vm.productionLabel }}</strong>
                </div>
                <div class="cla-banner__pill">
                    <span>Pago</span>
                    <strong>{{ vm.paymentLabel }}</strong>
                </div>
            </div>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-banner {
            display: grid;
            grid-template-columns: 8px minmax(0, 1fr) auto;
            gap: 16px;
            align-items: stretch;
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--brand-border);
            box-shadow: 0 18px 36px -30px var(--brand-shadow-strong);
            overflow: hidden;
        }
        .cla-banner__marker {
            border-radius: 999px;
            background: currentColor;
            opacity: 0.95;
        }
        .cla-banner__body {
            display: grid;
            gap: 6px;
        }
        .cla-banner__eyebrow {
            margin: 0;
            font-size: 11px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--brand-text-soft);
        }
        .cla-banner__title {
            margin: 0;
            font-size: 24px;
            line-height: 1.15;
            color: var(--brand-primary-strong);
        }
        .cla-banner__copy {
            margin: 0;
            color: var(--brand-text-muted);
            line-height: 1.5;
            max-width: 70ch;
        }
        .cla-banner__aside {
            display: grid;
            gap: 10px;
            min-width: 180px;
        }
        .cla-banner__pill {
            display: grid;
            gap: 2px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.76);
            border: 1px solid rgba(255, 255, 255, 0.55);
        }
        .cla-banner__pill span {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--brand-text-soft);
            font-weight: 700;
        }
        .cla-banner__pill strong {
            color: var(--brand-primary-strong);
        }
        .cla-tone-neutral {
            color: var(--brand-text-muted);
            background: linear-gradient(135deg, rgba(237, 241, 233, 0.95), rgba(255, 255, 255, 0.96));
        }
        .cla-tone-info {
            color: var(--brand-primary);
            background: linear-gradient(135deg, rgba(238, 245, 240, 0.98), rgba(255, 255, 255, 0.96));
        }
        .cla-tone-success {
            color: var(--brand-success);
            background: linear-gradient(135deg, rgba(237, 247, 241, 0.98), rgba(255, 255, 255, 0.96));
        }
        .cla-tone-warning {
            color: var(--brand-warning);
            background: linear-gradient(135deg, rgba(255, 245, 219, 0.98), rgba(255, 255, 255, 0.96));
        }
        .cla-tone-danger {
            color: var(--brand-error);
            background: linear-gradient(135deg, rgba(255, 240, 240, 0.98), rgba(255, 255, 255, 0.96));
        }
        @media (max-width: 900px) {
            .cla-banner {
                grid-template-columns: 8px 1fr;
            }
            .cla-banner__aside {
                grid-column: 2;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                min-width: 0;
            }
        }
        @media (max-width: 640px) {
            .cla-banner__aside {
                grid-template-columns: 1fr;
            }
        }
    `],
})
export class OrderStatusBannerComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    vm$!: Observable<OrderDashboardViewModel>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.vm$ = this.entity$.pipe(
            switchMap((entity) =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildOrderDashboard(data.order),
                ),
            ),
        );
    }

    getToneClass = getToneClass;
}
