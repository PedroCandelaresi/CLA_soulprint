import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';
import { buildOrderDashboard, getToneClass } from './order-detail.helpers';

@Component({
    selector: 'cla-order-payment-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="payment$ | async as vm">
        <section class="cla-panel">
            <header class="cla-panel__header">
                <div>
                    <p class="cla-panel__eyebrow">Pago</p>
                    <h3>{{ vm.paymentLabel }}</h3>
                </div>
                <span class="cla-status-pill" [ngClass]="getToneClass(vm.paymentTone)">
                    {{ vm.paymentState }}
                </span>
            </header>

            <p class="cla-panel__copy">{{ vm.paymentDescription }}</p>

            <div class="cla-alert cla-alert--danger" *ngIf="vm.hasPaymentMismatch">
                La orden y el pago muestran estados distintos. Conviene revisar antes de fabricar o despachar.
            </div>

            <div class="cla-grid">
                <div class="cla-card">
                    <span class="cla-card__label">Total del pedido</span>
                    <strong>{{ vm.totalWithTax / 100 | currency:vm.currencyCode:'symbol':'1.2-2' }}</strong>
                </div>
                <div class="cla-card" *ngIf="vm.paymentAmount != null">
                    <span class="cla-card__label">Monto registrado</span>
                    <strong>{{ vm.paymentAmount / 100 | currency:vm.currencyCode:'symbol':'1.2-2' }}</strong>
                </div>
                <div class="cla-card" *ngIf="vm.paymentMethod">
                    <span class="cla-card__label">Medio de pago</span>
                    <strong>{{ vm.paymentMethod }}</strong>
                </div>
                <div class="cla-card" *ngIf="vm.paymentTransactionId">
                    <span class="cla-card__label">Referencia</span>
                    <code>{{ vm.paymentTransactionId }}</code>
                </div>
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
            border: 1px solid transparent;
            font-size: 14px;
            line-height: 1.45;
        }
        .cla-alert--danger {
            background: var(--color-error-150);
            border-color: #efc0c0;
            color: var(--brand-error);
        }
        .cla-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .cla-card {
            display: grid;
            gap: 6px;
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
        .cla-card strong,
        .cla-card code {
            color: var(--brand-text);
            font-size: 15px;
        }
        .cla-card code {
            font-family: monospace;
            word-break: break-all;
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
export class OrderPaymentPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    payment$!: Observable<any>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.payment$ = this.entity$.pipe(
            switchMap((entity) =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildOrderDashboard(data.order),
                ),
            ),
        );
    }

    getToneClass = getToneClass;
}
