import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
} from '@angular/core';
import {
    CustomDetailComponent,
    DataService,
    NotificationService,
} from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';

// Mutation: cambiar estado de personalización de una línea (aprobar / rechazar)
const UPDATE_LINE_PERSONALIZATION_MUTATION = `
    mutation UpdateLinePersonalization($orderId: ID!, $lineId: ID!, $status: String!, $rejectedReason: String) {
        setOrderCustomFields(input: {
            id: $orderId
        }) {
            id
        }
    }
`;

// Mutation: cambiar productionStatus del pedido
const UPDATE_PRODUCTION_STATUS_MUTATION = `
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

interface PersonalizationLine {
    orderLineId: string;
    productName: string;
    requiresPersonalization: boolean;
    status: string;
    assetPreview: string | null;
    assetSource: string | null;
    notes: string | null;
    uploadedAt: string | null;
    fileName: string | null;
}

@Component({
    selector: 'cla-order-personalization-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="lines$ | async as lines">

        <!-- Sin personalización en este pedido -->
        <div *ngIf="lines.length === 0" class="cla-empty-notice">
            <span>Este pedido no tiene productos que requieran personalización.</span>
        </div>

        <!-- Una card por línea que requiere personalización -->
        <div *ngFor="let line of lines" class="cla-personalization-line">
            <div class="cla-line-header">
                <span class="cla-product-name">{{ line.productName }}</span>
                <span class="cla-badge" [ngClass]="getBadgeClass(line.status)">
                    {{ getStatusLabel(line.status) }}
                </span>
            </div>

            <!-- Imagen subida: preview grande + acciones -->
            <div *ngIf="line.assetPreview" class="cla-image-block">
                <img
                    [src]="line.assetPreview + '?preset=medium'"
                    [alt]="'Imagen de ' + line.productName"
                    class="cla-image-thumb"
                    (click)="openFullSize(line.assetSource)"
                    title="Clic para ver en tamaño completo">

                <div class="cla-image-actions">
                    <a [href]="line.assetSource" target="_blank" class="cla-btn cla-btn-ghost">
                        🔍 Ver en tamaño completo
                    </a>
                    <a [href]="line.assetSource" [download]="line.fileName ?? 'imagen'" class="cla-btn cla-btn-ghost">
                        ⬇️ Descargar
                    </a>
                </div>

                <div class="cla-image-meta">
                    <span *ngIf="line.fileName" class="cla-filename">📎 {{ line.fileName }}</span>
                    <span *ngIf="line.uploadedAt" class="cla-upload-date">
                        Subida el {{ line.uploadedAt | date:'dd/MM/yyyy \'a las\' HH:mm' }}
                    </span>
                </div>

                <!-- Notas del cliente -->
                <div *ngIf="line.notes" class="cla-notes-block">
                    <strong>Notas del cliente:</strong>
                    <p>{{ line.notes }}</p>
                </div>
            </div>

            <!-- Sin imagen todavía -->
            <div *ngIf="!line.assetPreview" class="cla-awaiting-upload">
                <span class="cla-await-icon">⏳</span>
                <p>El cliente todavía no subió la imagen para este producto.</p>
            </div>
        </div>

        <!-- Acciones de producción -->
        <div class="cla-production-actions" *ngIf="productionState$ | async as ps">
            <div class="cla-action-divider">Acciones de producción</div>

            <button
                *ngIf="ps.canStart"
                class="cla-btn cla-btn-primary"
                (click)="startProduction(ps.orderId)"
                [disabled]="ps.loading">
                🔨 Iniciar producción
            </button>
            <p *ngIf="ps.canStart" class="cla-action-help">
                Hacé clic cuando hayas revisado la imagen y estés listo para fabricar el pedido.
            </p>

            <button
                *ngIf="ps.canMarkReady"
                class="cla-btn cla-btn-success"
                (click)="markReady(ps.orderId)"
                [disabled]="ps.loading">
                ✅ Marcar como listo para enviar
            </button>
            <p *ngIf="ps.canMarkReady" class="cla-action-help">
                Hacé clic cuando el pedido esté terminado y empaquetado.
            </p>

            <div *ngIf="!ps.canStart && !ps.canMarkReady && !ps.isShipped" class="cla-info-notice">
                <ng-container [ngSwitch]="ps.productionStatus">
                    <span *ngSwitchCase="'in-production'">🔨 El pedido está actualmente en producción.</span>
                    <span *ngSwitchCase="'ready'">✅ El pedido está listo y esperando despacho.</span>
                    <span *ngSwitchDefault>ℹ️ No hay acciones de producción disponibles en este momento.</span>
                </ng-container>
            </div>
        </div>

    </ng-container>
    `,
    styles: [`
        .cla-empty-notice {
            padding: 16px; background: #f9fafb; border-radius: 8px;
            color: #6b7280; text-align: center;
        }
        .cla-personalization-line {
            border: 1px solid #e5e7eb; border-radius: 10px;
            padding: 16px; margin-bottom: 14px;
        }
        .cla-line-header {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        }
        .cla-product-name { font-weight: 700; font-size: 15px; }
        .cla-badge { padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .cla-badge-not-required { background:#f3f4f6; color:#6b7280; }
        .cla-badge-pending      { background:#fef3c7; color:#92400e; }
        .cla-badge-pending-upload { background:#fef3c7; color:#92400e; }
        .cla-badge-uploaded     { background:#dbeafe; color:#1e40af; }
        .cla-badge-approved     { background:#d1fae5; color:#065f46; }
        .cla-badge-rejected     { background:#fee2e2; color:#991b1b; }
        .cla-image-block { margin-top: 8px; }
        .cla-image-thumb {
            width: 200px; height: 200px; object-fit: cover;
            border-radius: 8px; cursor: zoom-in;
            border: 2px solid #e5e7eb; transition: border-color 0.2s;
        }
        .cla-image-thumb:hover { border-color: #3b82f6; }
        .cla-image-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .cla-image-meta { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
        .cla-filename { font-size: 12px; color: #6b7280; }
        .cla-upload-date { font-size: 12px; color: #9ca3af; }
        .cla-notes-block {
            margin-top: 10px; background: #f9fafb; padding: 10px 12px; border-radius: 6px;
            font-size: 13px;
        }
        .cla-notes-block p { margin: 4px 0 0; color: #374151; }
        .cla-awaiting-upload {
            display: flex; align-items: center; gap: 10px;
            background: #fffbeb; padding: 12px; border-radius: 6px; color: #92400e;
        }
        .cla-await-icon { font-size: 20px; }
        .cla-production-actions { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .cla-action-divider {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: #6b7280; margin-bottom: 12px;
        }
        .cla-action-help { font-size: 12px; color: #6b7280; margin: 6px 0 12px; }
        .cla-btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 10px 18px; border-radius: 8px; border: none;
            font-weight: 600; cursor: pointer; font-size: 14px; text-decoration: none;
            transition: opacity 0.15s;
        }
        .cla-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cla-btn-ghost { background: #f3f4f6; color: #374151; }
        .cla-btn-ghost:hover { background: #e5e7eb; }
        .cla-btn-primary { background: #2563eb; color: #fff; }
        .cla-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .cla-btn-success { background: #16a34a; color: #fff; }
        .cla-btn-success:hover:not(:disabled) { background: #15803d; }
        .cla-info-notice { color: #6b7280; font-size: 13px; padding: 10px; background: #f9fafb; border-radius: 6px; }
    `],
})
export class OrderPersonalizationPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    lines$!: Observable<PersonalizationLine[]>;
    productionState$!: Observable<any>;
    private loadingProductionId: string | null = null;

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    ngOnInit(): void {
        const order$ = this.entity$.pipe(
            switchMap(entity =>
                this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapStream(
                    (data: any) => data.order
                )
            )
        );

        this.lines$ = order$.pipe(
            map((order: any) =>
                (order?.lines ?? [])
                    .filter((l: any) => l.productVariant?.customFields?.requiresPersonalization === true)
                    .map((l: any) => ({
                        orderLineId: l.id,
                        productName: l.productVariant?.product?.name ?? 'Producto',
                        requiresPersonalization: true,
                        status: l.customFields?.personalizationStatus ?? 'pending-upload',
                        assetPreview: l.customFields?.personalizationAsset?.preview ?? null,
                        assetSource: l.customFields?.personalizationAsset?.source ?? null,
                        notes: l.customFields?.personalizationNotes ?? null,
                        uploadedAt: l.customFields?.personalizationUploadedAt ?? null,
                        fileName: l.customFields?.personalizationSnapshotFileName ?? null,
                    }))
            )
        );

        this.productionState$ = order$.pipe(
            map((order: any) => {
                if (!order) return { canStart: false, canMarkReady: false, isShipped: false };
                const cf = order.customFields ?? {};
                const overallStatus = cf.personalizationOverallStatus ?? 'not-required';
                const productionStatus = cf.productionStatus ?? 'not-started';
                const isShipped = Boolean(cf.andreaniTrackingNumber);
                const isPaid = ['PaymentAuthorized', 'PaymentSettled'].includes(order.state);
                const imagesReady = overallStatus === 'complete' || overallStatus === 'not-required';

                return {
                    orderId: order.id,
                    productionStatus,
                    isShipped,
                    loading: this.loadingProductionId === order.id,
                    canStart: isPaid && imagesReady && productionStatus === 'not-started',
                    canMarkReady: isPaid && productionStatus === 'in-production',
                };
            })
        );
    }

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'not-required': 'No requerida',
            'pending-upload': '⏳ Pendiente',
            'uploaded': '📁 Cargada',
            'approved': '✅ Aprobada',
            'rejected': '❌ Rechazada',
        };
        return labels[status] ?? status;
    }

    getBadgeClass(status: string): Record<string, boolean> {
        return { [`cla-badge-${status}`]: true };
    }

    openFullSize(url: string | null): void {
        if (url) window.open(url, '_blank');
    }

    async startProduction(orderId: string): Promise<void> {
        this.loadingProductionId = orderId;
        try {
            await this.dataService
                .mutate(UPDATE_PRODUCTION_STATUS_MUTATION, { id: orderId, status: 'in-production' })
                .toPromise();
            this.notificationService.success('Producción iniciada correctamente.');
        } catch {
            this.notificationService.error('No se pudo iniciar la producción.');
        } finally {
            this.loadingProductionId = null;
        }
    }

    async markReady(orderId: string): Promise<void> {
        this.loadingProductionId = orderId;
        try {
            await this.dataService
                .mutate(UPDATE_PRODUCTION_STATUS_MUTATION, { id: orderId, status: 'ready' })
                .toPromise();
            this.notificationService.success('Pedido marcado como listo para enviar.');
        } catch {
            this.notificationService.error('No se pudo actualizar el estado.');
        } finally {
            this.loadingProductionId = null;
        }
    }
}
