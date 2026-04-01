import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService, NotificationService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';

@Component({
    selector: 'cla-order-actions',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="actionState$ | async as state">

        <!-- Acciones disponibles según el estado actual -->
        <div class="cla-actions-container">
            <h4 class="cla-actions-title">Acciones disponibles</h4>

            <!-- No hay acciones -->
            <div *ngIf="state.actions.length === 0" class="cla-no-actions">
                ✓ No hay acciones pendientes en este momento.
            </div>

            <!-- Lista de acciones -->
            <div class="cla-action-list">
                <div *ngFor="let action of state.actions" class="cla-action-item">
                    <div class="cla-action-info">
                        <strong>{{ action.label }}</strong>
                        <p>{{ action.description }}</p>
                    </div>
                    <button
                        [class]="'cla-btn cla-btn-' + action.variant"
                        (click)="executeAction(action, state.orderId)"
                        [disabled]="state.loading">
                        {{ action.icon }} {{ action.label }}
                    </button>
                </div>
            </div>
        </div>

    </ng-container>
    `,
    styles: [`
        .cla-actions-container {
            background: #f9fafb; border-radius: 10px; padding: 16px; margin-top: 8px;
        }
        .cla-actions-title {
            font-size: 13px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; color: #6b7280; margin: 0 0 14px;
        }
        .cla-no-actions { color: #6b7280; font-size: 13px; text-align: center; padding: 8px; }
        .cla-action-list { display: flex; flex-direction: column; gap: 12px; }
        .cla-action-item {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
            background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;
        }
        .cla-action-info { flex: 1; }
        .cla-action-info strong { font-size: 14px; display: block; }
        .cla-action-info p { font-size: 12px; color: #6b7280; margin: 2px 0 0; }
        .cla-btn {
            padding: 8px 16px; border: none; border-radius: 7px;
            font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap;
            display: inline-flex; align-items: center; gap: 5px;
        }
        .cla-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cla-btn-primary { background: #2563eb; color: #fff; }
        .cla-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .cla-btn-success { background: #16a34a; color: #fff; }
        .cla-btn-success:hover:not(:disabled) { background: #15803d; }
        .cla-btn-neutral { background: #e5e7eb; color: #374151; }
        .cla-btn-neutral:hover:not(:disabled) { background: #d1d5db; }
    `],
})
export class OrderActionsComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    actionState$!: Observable<any>;
    private loadingOrderId: string | null = null;

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    ngOnInit(): void {
        this.actionState$ = this.entity$.pipe(
            switchMap(entity =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapStream(
                    (data: any) => {
                        const o = data.order;
                        if (!o) return { actions: [], orderId: null, loading: false };
                        const cf = o.customFields ?? {};
                        const isPaid = ['PaymentAuthorized', 'PaymentSettled'].includes(o.state);
                        const overall = cf.personalizationOverallStatus ?? 'not-required';
                        const imagesReady = overall === 'complete' || overall === 'not-required';
                        const production = cf.productionStatus ?? 'not-started';

                        const actions: any[] = [];

                        if (isPaid && imagesReady && production === 'not-started') {
                            actions.push({
                                key: 'start-production',
                                label: 'Iniciar producción',
                                description: 'Marcá el pedido como en fabricación.',
                                icon: '🔨',
                                variant: 'primary',
                            });
                        }

                        if (isPaid && production === 'in-production') {
                            actions.push({
                                key: 'mark-ready',
                                label: 'Marcar listo para enviar',
                                description: 'El producto está terminado y empaquetado.',
                                icon: '✅',
                                variant: 'success',
                            });
                        }

                        return {
                            orderId: o.id,
                            actions,
                            loading: this.loadingOrderId === o.id,
                        };
                    }
                )
            )
        );
    }

    async executeAction(action: any, orderId: string): Promise<void> {
        this.loadingOrderId = orderId;

        const mutation = `
            mutation UpdateProductionStatus($id: ID!, $status: String!) {
                setOrderCustomFields(input: {
                    id: $id
                    customFields: { productionStatus: $status }
                }) {
                    id
                    customFields { productionStatus }
                }
            }
        `;

        try {
            if (action.key === 'start-production') {
                await this.dataService.mutate(mutation, { id: orderId, status: 'in-production' }).toPromise();
                this.notificationService.success('Producción iniciada.');
            } else if (action.key === 'mark-ready') {
                await this.dataService.mutate(mutation, { id: orderId, status: 'ready' }).toPromise();
                this.notificationService.success('Pedido marcado como listo para enviar.');
            }
        } catch {
            this.notificationService.error('No se pudo ejecutar la acción. Intentá de nuevo.');
        } finally {
            this.loadingOrderId = null;
        }
    }
}
