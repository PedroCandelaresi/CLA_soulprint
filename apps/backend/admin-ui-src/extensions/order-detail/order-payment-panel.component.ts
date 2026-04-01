import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';

@Component({
    selector: 'cla-order-payment-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="payment$ | async as p">

        <!-- Estado general del pago -->
        <div class="cla-payment-state" [ngClass]="getStateClass(p.orderState)">
            <span class="cla-state-icon">{{ getStateIcon(p.orderState) }}</span>
            <div>
                <strong>{{ getStateLabel(p.orderState) }}</strong>
                <p>{{ getStateHelp(p.orderState) }}</p>
            </div>
        </div>

        <!-- Alerta: posible inconsistencia -->
        <div class="cla-alert cla-alert-warn" *ngIf="p.hasMismatch">
            ⚠️ La orden sigue en estado "<strong>{{ p.orderState }}</strong>" pero puede haber un pago
            registrado. Verificar en el panel de pagos o contactar al proveedor.
        </div>

        <!-- Detalles del pago -->
        <div class="cla-detail-grid" *ngIf="p.payments && p.payments.length > 0">
            <ng-container *ngFor="let pay of p.payments">
                <div class="cla-detail-row">
                    <span class="cla-detail-label">Monto</span>
                    <strong>{{ pay.amount / 100 | currency:(p.currencyCode):'symbol':'1.2-2' }}</strong>
                </div>
                <div class="cla-detail-row">
                    <span class="cla-detail-label">Método</span>
                    <span>{{ pay.method }}</span>
                </div>
                <div class="cla-detail-row" *ngIf="pay.transactionId">
                    <span class="cla-detail-label">ID Transacción</span>
                    <code class="cla-code">{{ pay.transactionId }}</code>
                </div>
                <div class="cla-detail-row">
                    <span class="cla-detail-label">Estado Pago</span>
                    <span class="cla-badge" [ngClass]="getPaymentBadgeClass(pay.state)">
                        {{ pay.state }}
                    </span>
                </div>
            </ng-container>
        </div>

        <!-- Monto total de la orden -->
        <div class="cla-total-block">
            <span>Total del pedido:</span>
            <strong>{{ p.totalWithTax / 100 | currency:(p.currencyCode):'symbol':'1.2-2' }}</strong>
        </div>

    </ng-container>
    `,
    styles: [`
        .cla-payment-state {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 14px 16px; border-radius: 8px; border-left: 4px solid;
            margin-bottom: 14px;
        }
        .cla-state-pending  { background:#fffbeb; border-color:#f59e0b; }
        .cla-state-paid     { background:#f0fdf4; border-color:#22c55e; }
        .cla-state-failed   { background:#fef2f2; border-color:#ef4444; }
        .cla-state-icon     { font-size: 22px; flex-shrink:0; }
        .cla-alert { padding: 12px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
        .cla-alert-warn { background:#fffbeb; color:#92400e; border: 1px solid #fcd34d; }
        .cla-detail-grid { display: grid; gap: 8px; margin-bottom: 14px; }
        .cla-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
        .cla-detail-label { font-size: 13px; color: #6b7280; }
        .cla-code { font-family: monospace; font-size: 12px; background:#f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .cla-badge { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .cla-badge-settled, .cla-badge-authorized { background:#d1fae5; color:#065f46; }
        .cla-badge-error, .cla-badge-declined { background:#fee2e2; color:#991b1b; }
        .cla-badge-created { background:#f3f4f6; color:#6b7280; }
        .cla-total-block {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 0; border-top: 2px solid #e5e7eb; font-size: 15px;
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
            switchMap(entity =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapStream(
                    (data: any) => {
                        const o = data.order;
                        const hasMismatch = o?.state === 'ArrangingPayment' &&
                            (o?.payments ?? []).some((p: any) => ['Settled', 'Authorized'].includes(p.state));
                        return {
                            orderState: o?.state,
                            totalWithTax: o?.totalWithTax ?? 0,
                            currencyCode: o?.currencyCode ?? 'ARS',
                            payments: o?.payments ?? [],
                            hasMismatch,
                        };
                    }
                )
            )
        );
    }

    getStateLabel(state: string): string {
        const labels: Record<string, string> = {
            'ArrangingPayment': 'Esperando pago',
            'PaymentAuthorized': 'Pago autorizado',
            'PaymentSettled': '✓ Pago confirmado',
            'Cancelled': 'Pago cancelado',
        };
        return labels[state] ?? state;
    }

    getStateHelp(state: string): string {
        const help: Record<string, string> = {
            'ArrangingPayment': 'El cliente todavía no completó el pago.',
            'PaymentAuthorized': 'El pago fue autorizado pero todavía no acreditado.',
            'PaymentSettled': 'El dinero fue acreditado correctamente.',
            'Cancelled': 'El pedido fue cancelado.',
        };
        return help[state] ?? '';
    }

    getStateIcon(state: string): string {
        const icons: Record<string, string> = {
            'ArrangingPayment': '⏳',
            'PaymentAuthorized': '🔐',
            'PaymentSettled': '✅',
            'Cancelled': '❌',
        };
        return icons[state] ?? '💳';
    }

    getStateClass(state: string): Record<string, boolean> {
        const isPaid = ['PaymentAuthorized', 'PaymentSettled'].includes(state);
        const isFailed = state === 'Cancelled';
        return {
            'cla-state-paid': isPaid,
            'cla-state-failed': isFailed,
            'cla-state-pending': !isPaid && !isFailed,
        };
    }

    getPaymentBadgeClass(state: string): Record<string, boolean> {
        return { [`cla-badge-${state.toLowerCase()}`]: true };
    }
}
