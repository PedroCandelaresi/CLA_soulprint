import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
} from '@angular/core';
import { DataService, CustomDetailComponent } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ORDER_DASHBOARD_QUERY } from './order-detail.module';

interface StatusConfig {
    label: string;
    colorClass: string;
    icon: string;
    help: string;
    nextAction?: string;
}

function deriveBusinessStatus(order: any): string {
    if (!order) return 'unknown';
    const cf = order.customFields ?? {};
    if (order.state === 'Cancelled') return 'cancelled';

    const isPaid = ['PaymentAuthorized', 'PaymentSettled'].includes(order.state) ||
        (order.payments ?? []).some((p: any) => ['Authorized', 'Settled'].includes(p.state));

    if (!isPaid) return 'pending_payment';

    const shipStatus = (cf.andreaniShipmentStatus ?? '').toLowerCase();
    if (shipStatus.includes('entreg') || shipStatus.includes('deliver')) return 'delivered';
    if (cf.andreaniTrackingNumber) return 'shipped';
    if (cf.productionStatus === 'ready') return 'ready_to_ship';
    if (cf.productionStatus === 'in-production') return 'in_production';

    const overall = cf.personalizationOverallStatus ?? 'not-required';
    if (overall === 'pending' || overall === 'partial') return 'awaiting_personalization';
    if (overall === 'complete') return 'personalization_received';
    return 'paid';
}

const STATUS_MAP: Record<string, StatusConfig> = {
    pending_payment: {
        label: 'Esperando pago',
        colorClass: 'cla-status-gray',
        icon: '⏳',
        help: 'El cliente todavía no completó el pago. No se requiere ninguna acción.',
    },
    paid: {
        label: 'Pago confirmado',
        colorClass: 'cla-status-blue',
        icon: '✅',
        help: 'El pago fue acreditado correctamente.',
        nextAction: 'Si el pedido requiere imagen, el cliente recibirá un email para subirla.',
    },
    awaiting_personalization: {
        label: 'Falta imagen del cliente',
        colorClass: 'cla-status-yellow',
        icon: '🖼️',
        help: 'El pedido está pago, pero el cliente todavía no subió su imagen.',
        nextAction: 'Si lleva más de 24 hs sin imagen, podés contactar al cliente.',
    },
    personalization_received: {
        label: 'Imagen recibida — listo para producción',
        colorClass: 'cla-status-cyan',
        icon: '📥',
        help: 'El cliente ya subió su imagen. Podés revisar el archivo y comenzar la producción.',
        nextAction: 'Revisá la imagen en la pestaña "Personalización" y hacé clic en "Iniciar producción".',
    },
    in_production: {
        label: 'En producción',
        colorClass: 'cla-status-purple',
        icon: '🔨',
        help: 'El pedido está siendo fabricado.',
        nextAction: 'Cuando esté listo, hacé clic en "Marcar como listo para enviar".',
    },
    ready_to_ship: {
        label: 'Listo para enviar',
        colorClass: 'cla-status-orange',
        icon: '📦',
        help: 'El pedido terminó de producirse y está esperando ser despachado.',
        nextAction: 'Preparar el bulto y coordinar el despacho.',
    },
    shipped: {
        label: 'Enviado',
        colorClass: 'cla-status-teal',
        icon: '🚚',
        help: 'El pedido fue despachado y está en camino al cliente.',
    },
    delivered: {
        label: 'Entregado',
        colorClass: 'cla-status-green',
        icon: '🏠',
        help: 'El pedido fue entregado al cliente exitosamente.',
    },
    cancelled: {
        label: 'Cancelado',
        colorClass: 'cla-status-red',
        icon: '❌',
        help: 'Este pedido fue cancelado.',
    },
    unknown: {
        label: 'Estado desconocido',
        colorClass: 'cla-status-gray',
        icon: '❓',
        help: 'No se pudo determinar el estado del pedido.',
    },
};

@Component({
    selector: 'cla-order-status-banner',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="statusConfig$ | async as cfg">
        <div class="cla-status-banner {{ cfg.colorClass }}">
            <span class="cla-status-icon">{{ cfg.icon }}</span>
            <div class="cla-status-body">
                <strong class="cla-status-title">{{ cfg.label }}</strong>
                <p class="cla-status-help">{{ cfg.help }}</p>
                <p class="cla-status-action" *ngIf="cfg.nextAction">
                    👉 {{ cfg.nextAction }}
                </p>
            </div>
        </div>

        <div class="cla-order-meta" *ngIf="orderMeta$ | async as meta">
            <div class="cla-meta-row">
                <span class="cla-meta-label">Pedido</span>
                <strong>{{ meta.code }}</strong>
            </div>
            <div class="cla-meta-row" *ngIf="meta.customerName">
                <span class="cla-meta-label">Cliente</span>
                <span>{{ meta.customerName }}</span>
            </div>
            <div class="cla-meta-row">
                <span class="cla-meta-label">Total</span>
                <strong>{{ meta.totalWithTax / 100 | currency:meta.currencyCode:'symbol':'1.2-2' }}</strong>
            </div>
            <div class="cla-meta-row">
                <span class="cla-meta-label">Fecha</span>
                <span>{{ meta.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
        </div>
    </ng-container>
    `,
    styles: [`
        .cla-status-banner {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 16px 20px;
            border-radius: 10px;
            border-left: 5px solid;
            margin-bottom: 16px;
        }
        .cla-status-gray   { background:#f9fafb; border-color:#9ca3af; }
        .cla-status-yellow { background:#fffbeb; border-color:#f59e0b; }
        .cla-status-blue   { background:#eff6ff; border-color:#3b82f6; }
        .cla-status-cyan   { background:#ecfeff; border-color:#06b6d4; }
        .cla-status-purple { background:#faf5ff; border-color:#a855f7; }
        .cla-status-orange { background:#fff7ed; border-color:#f97316; }
        .cla-status-teal   { background:#f0fdfa; border-color:#14b8a6; }
        .cla-status-green  { background:#f0fdf4; border-color:#22c55e; }
        .cla-status-red    { background:#fef2f2; border-color:#ef4444; }
        .cla-status-icon   { font-size:28px; flex-shrink:0; line-height:1; }
        .cla-status-title  { font-size:16px; font-weight:700; display:block; }
        .cla-status-help   { margin:4px 0 0; color:#4b5563; font-size:13px; line-height:1.4; }
        .cla-status-action { margin:8px 0 0; color:#1d4ed8; font-weight:500; font-size:13px; }
        .cla-order-meta    { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin-top:16px; }
        .cla-meta-row      { display:flex; flex-direction:column; gap:2px; }
        .cla-meta-label    { font-size:11px; font-weight:600; text-transform:uppercase; color:#6b7280; letter-spacing:0.05em; }
    `],
})
export class OrderStatusBannerComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    statusConfig$!: Observable<StatusConfig>;
    orderMeta$!: Observable<any>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.statusConfig$ = this.entity$.pipe(
            switchMap(entity => this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                (data: any) => STATUS_MAP[deriveBusinessStatus(data.order)] ?? STATUS_MAP['unknown']
            ))
        );

        this.orderMeta$ = this.entity$.pipe(
            switchMap(entity => this.dataService.query(ORDER_DASHBOARD_QUERY, { id: entity.id }).mapSingle(
                (data: any) => {
                    const o = data.order;
                    return {
                        code: o?.code,
                        customerName: o?.customer
                            ? `${o.customer.firstName} ${o.customer.lastName}`.trim()
                            : null,
                        totalWithTax: o?.totalWithTax ?? 0,
                        currencyCode: o?.currencyCode ?? 'ARS',
                        createdAt: o?.createdAt,
                    };
                }
            ))
        );
    }
}
