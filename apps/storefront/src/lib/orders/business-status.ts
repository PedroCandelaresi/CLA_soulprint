import type { CustomerOrderSummary } from '@/types/customer-account';

export type OrderBusinessStatus =
    | 'pending_payment'
    | 'paid'
    | 'awaiting_personalization'
    | 'personalization_received'
    | 'in_production'
    | 'ready_to_ship'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type OrderProductionStatus = 'not-started' | 'in-production' | 'ready';

export type OrderTimelineStepState = 'complete' | 'current' | 'upcoming' | 'action-required' | 'skipped';

export interface OrderTimelineStep {
    key: string;
    label: string;
    description: string;
    state: OrderTimelineStepState;
    timestamp?: string | null;
}

function normalizeText(value: string | null | undefined): string {
    return String(value || '').trim().toLowerCase();
}

export function normalizeProductionStatus(value: string | null | undefined): OrderProductionStatus {
    const normalized = normalizeText(value);
    if (normalized === 'in-production' || normalized === 'in_production' || normalized === 'production') {
        return 'in-production';
    }
    if (
        normalized === 'ready'
        || normalized === 'ready-to-ship'
        || normalized === 'ready_to_ship'
        || normalized === 'listo'
    ) {
        return 'ready';
    }
    return 'not-started';
}

function isPaidOrder(order: CustomerOrderSummary): boolean {
    const paymentState = normalizeText(order.payment.state);
    const orderState = normalizeText(order.state);
    return ['authorized', 'settled', 'paymentauthorized', 'paymentsettled', 'approved'].includes(paymentState)
        || ['paymentauthorized', 'paymentsettled'].includes(orderState);
}

function isCancelled(order: CustomerOrderSummary): boolean {
    return normalizeText(order.state) === 'cancelled';
}

function isDeliveredOrder(order: CustomerOrderSummary): boolean {
    const shipmentState = normalizeText(order.shipmentState);
    return shipmentState.includes('deliver') || shipmentState.includes('entreg');
}

function isShippedOrder(order: CustomerOrderSummary): boolean {
    const shipmentState = normalizeText(order.shipmentState);
    if (isDeliveredOrder(order)) {
        return true;
    }
    if (order.trackingCode) {
        return true;
    }
    return shipmentState.includes('ship')
        || shipmentState.includes('dispatch')
        || shipmentState.includes('enviado')
        || shipmentState.includes('transito')
        || shipmentState.includes('camino');
}

export function deriveOrderBusinessStatus(order: CustomerOrderSummary): OrderBusinessStatus {
    const productionStatus = normalizeProductionStatus(order.productionStatus);
    const requiresPersonalization = Boolean(order.personalization?.requiresPersonalization);
    const personalizationStatus = order.personalization?.personalizationStatus || 'not-required';

    if (isCancelled(order)) {
        return 'cancelled';
    }
    if (!isPaidOrder(order)) {
        return 'pending_payment';
    }
    if (isDeliveredOrder(order)) {
        return 'delivered';
    }
    if (isShippedOrder(order)) {
        return 'shipped';
    }
    if (productionStatus === 'ready') {
        return 'ready_to_ship';
    }
    if (productionStatus === 'in-production') {
        return 'in_production';
    }
    if (requiresPersonalization && personalizationStatus === 'pending') {
        return 'awaiting_personalization';
    }
    if (requiresPersonalization && personalizationStatus === 'uploaded') {
        return 'personalization_received';
    }
    return 'paid';
}

export function getBusinessStatusPresentation(status: OrderBusinessStatus): {
    label: string;
    description: string;
    tone: 'default' | 'info' | 'warning' | 'success' | 'error';
} {
    switch (status) {
        case 'pending_payment':
            return {
                label: 'Pendiente de pago',
                description: 'Recibimos el pedido, pero todavía no se confirmó el pago.',
                tone: 'default',
            };
        case 'paid':
            return {
                label: 'Pago confirmado',
                description: 'El pago ya fue acreditado y el pedido quedó listo para preparación.',
                tone: 'info',
            };
        case 'awaiting_personalization':
            return {
                label: 'Esperando personalización',
                description: 'El pago está confirmado, pero todavía falta la imagen requerida para avanzar.',
                tone: 'warning',
            };
        case 'personalization_received':
            return {
                label: 'Material recibido',
                description: 'Ya recibimos el archivo de personalización. El pedido puede pasar a producción.',
                tone: 'info',
            };
        case 'in_production':
            return {
                label: 'En producción',
                description: 'El pedido ya está en producción.',
                tone: 'info',
            };
        case 'ready_to_ship':
            return {
                label: 'Listo para enviar',
                description: 'La producción terminó y el pedido quedó listo para despacho.',
                tone: 'info',
            };
        case 'shipped':
            return {
                label: 'Enviado',
                description: 'El pedido ya salió y está en tránsito.',
                tone: 'success',
            };
        case 'delivered':
            return {
                label: 'Entregado',
                description: 'El pedido figura como entregado.',
                tone: 'success',
            };
        case 'cancelled':
            return {
                label: 'Cancelado',
                description: 'El pedido quedó cancelado y ya no avanza en el flujo.',
                tone: 'error',
            };
    }
}

export function getProductionStatusLabel(value: string | null | undefined): string {
    const status = normalizeProductionStatus(value);
    if (status === 'in-production') {
        return 'En producción';
    }
    if (status === 'ready') {
        return 'Listo para enviar';
    }
    return 'Sin iniciar';
}

export function buildOrderTimeline(order: CustomerOrderSummary): OrderTimelineStep[] {
    const paid = isPaidOrder(order);
    const requiresPersonalization = Boolean(order.personalization?.requiresPersonalization);
    const personalizationStatus = order.personalization?.personalizationStatus || 'not-required';
    const productionStatus = normalizeProductionStatus(order.productionStatus);
    const shipped = isShippedOrder(order);
    const delivered = isDeliveredOrder(order);

    return [
        {
            key: 'received',
            label: 'Pedido recibido',
            description: 'La orden quedó registrada y visible en tu cuenta.',
            state: 'complete',
            timestamp: order.createdAt,
        },
        {
            key: 'paid',
            label: 'Pago confirmado',
            description: paid ? 'El pago ya fue acreditado correctamente.' : 'Esperando confirmación del pago.',
            state: paid ? 'complete' : 'current',
            timestamp: order.orderPlacedAt || order.updatedAt,
        },
        {
            key: 'personalization',
            label: requiresPersonalization ? 'Foto / material' : 'Personalización',
            description: !requiresPersonalization
                ? 'Este pedido no requiere archivo de personalización.'
                : personalizationStatus === 'uploaded'
                    ? 'Recibimos la imagen y quedó vinculada a la orden.'
                    : paid
                        ? 'Falta subir la imagen requerida para pasar a producción.'
                        : 'La imagen se va a pedir después de confirmar el pago.',
            state: !requiresPersonalization
                ? 'skipped'
                : personalizationStatus === 'uploaded'
                    ? 'complete'
                    : paid
                        ? 'action-required'
                        : 'upcoming',
            timestamp: order.personalization?.uploadedAt || null,
        },
        {
            key: 'production',
            label: 'Producción',
            description: productionStatus === 'in-production'
                ? 'Operación marcó el pedido como en producción.'
                : productionStatus === 'ready'
                    ? 'La producción terminó y el pedido quedó listo para despacho.'
                    : requiresPersonalization && personalizationStatus !== 'uploaded'
                        ? 'La producción arranca cuando esté la personalización requerida.'
                        : paid
                            ? 'El pedido está listo para que operación lo ingrese en producción.'
                            : 'Este paso se habilita después del pago.',
            state: productionStatus === 'ready'
                ? 'complete'
                : productionStatus === 'in-production'
                    ? 'current'
                    : paid
                        ? 'upcoming'
                        : 'upcoming',
            timestamp: order.productionUpdatedAt,
        },
        {
            key: 'shipped',
            label: 'Enviado',
            description: delivered
                ? `El pedido ya fue entregado${order.trackingCode ? ` · Tracking ${order.trackingCode}` : ''}.`
                : shipped
                    ? `El pedido ya salió${order.trackingCode ? ` · Tracking ${order.trackingCode}` : ''}.`
                    : order.trackingCode
                        ? `Tracking disponible: ${order.trackingCode}.`
                        : 'Todavía no hay datos de envío disponibles.',
            state: delivered
                ? 'complete'
                : shipped
                    ? 'current'
                    : 'upcoming',
            timestamp: null,
        },
        {
            key: 'delivered',
            label: 'Entregado',
            description: delivered ? 'El envío figura como entregado.' : 'Todavía no figura como entregado.',
            state: delivered ? 'complete' : 'upcoming',
            timestamp: null,
        },
    ];
}
