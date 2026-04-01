import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService, NotificationService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';
import {
    buildOrderDashboard,
    OrderDashboardViewModel,
} from './order-detail.helpers';

@Component({
    selector: 'cla-order-actions',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="vm$ | async as vm">
        <section class="cla-next-step">
            <div class="cla-next-step__header">
                <div>
                    <p class="cla-step-label">Próximo paso recomendado</p>
                    <h3>{{ vm.nextStepTitle }}</h3>
                </div>
                <div class="cla-step-state">{{ vm.businessStatusLabel }}</div>
            </div>

            <p class="cla-step-copy">{{ vm.nextStepDescription }}</p>

            <ul class="cla-step-checklist" *ngIf="vm.nextStepChecklist.length > 0">
                <li *ngFor="let item of vm.nextStepChecklist">{{ item }}</li>
            </ul>

            <div class="cla-step-actions" *ngIf="vm.primaryActionLabel || vm.secondaryActionLabel">
                <button
                    *ngIf="vm.primaryActionLabel"
                    type="button"
                    [class]="'cla-btn cla-btn--' + vm.primaryActionVariant"
                    [disabled]="loadingOrderId === vm.id"
                    (click)="runAction(vm, vm.primaryActionKey)">
                    {{ vm.primaryActionLabel }}
                </button>

                <button
                    *ngIf="vm.secondaryActionLabel"
                    type="button"
                    class="cla-btn cla-btn--secondary"
                    (click)="runAction(vm, vm.secondaryActionKey)">
                    {{ vm.secondaryActionLabel }}
                </button>
            </div>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-next-step {
            display: grid;
            gap: 14px;
            padding: 18px;
            border-radius: 18px;
            border: 1px solid var(--brand-border-strong);
            background: linear-gradient(135deg, rgba(0, 72, 37, 0.06), rgba(255, 255, 255, 0.92));
        }
        .cla-next-step__header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
        }
        .cla-step-label {
            margin: 0 0 4px;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--brand-text-soft);
            font-weight: 700;
        }
        .cla-next-step h3 {
            margin: 0;
            font-size: 22px;
            line-height: 1.2;
            color: var(--brand-primary-strong);
        }
        .cla-step-state {
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.84);
            border: 1px solid var(--brand-border);
            font-size: 12px;
            font-weight: 700;
            color: var(--brand-primary);
            white-space: nowrap;
        }
        .cla-step-copy {
            margin: 0;
            color: var(--brand-text-muted);
            line-height: 1.5;
        }
        .cla-step-checklist {
            margin: 0;
            padding-left: 18px;
            color: var(--brand-text);
            display: grid;
            gap: 6px;
        }
        .cla-step-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .cla-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 16px;
            border-radius: 12px;
            border: 1px solid transparent;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .cla-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .cla-btn--primary {
            background: var(--brand-primary);
            color: #fff;
        }
        .cla-btn--primary:hover:not(:disabled) {
            background: var(--brand-primary-hover);
        }
        .cla-btn--success {
            background: var(--brand-success);
            color: #fff;
        }
        .cla-btn--success:hover:not(:disabled) {
            background: #185236;
        }
        .cla-btn--secondary {
            background: rgba(255, 255, 255, 0.85);
            border-color: var(--brand-border);
            color: var(--brand-text);
        }
        .cla-btn--secondary:hover {
            background: var(--brand-primary-soft);
        }
        @media (max-width: 720px) {
            .cla-next-step__header {
                flex-direction: column;
            }
        }
    `],
})
export class OrderActionsComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    vm$!: Observable<OrderDashboardViewModel>;
    loadingOrderId: string | null = null;

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    ngOnInit(): void {
        this.vm$ = this.entity$.pipe(
            switchMap((entity) =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildOrderDashboard(data.order),
                ),
            ),
        );
    }

    async runAction(vm: OrderDashboardViewModel, actionKey: string | null): Promise<void> {
        if (!actionKey) {
            return;
        }

        if (actionKey === 'open-latest-asset') {
            if (vm.latestAssetUrl) {
                window.open(vm.latestAssetUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        if (!vm.id) {
            return;
        }

        const nextStatus = actionKey === 'start-production'
            ? 'in-production'
            : actionKey === 'mark-ready'
                ? 'ready'
                : null;

        if (!nextStatus) {
            return;
        }

        this.loadingOrderId = vm.id;
        try {
            await this.dataService.order.updateOrderCustomFields({
                id: vm.id,
                customFields: { productionStatus: nextStatus },
            }).toPromise();
            this.notificationService.success(
                nextStatus === 'in-production'
                    ? 'El pedido quedó marcado como en producción.'
                    : 'El pedido quedó marcado como listo para enviar.',
            );
        } catch {
            this.notificationService.error('No se pudo actualizar el próximo paso del pedido.');
        } finally {
            this.loadingOrderId = null;
        }
    }
}
