import type { Order, Payment } from '@vendure/core';

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

function normalizeText(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

function getCustomFieldValue<T>(order: Order, key: string): T | null {
    const customFields = (order.customFields || {}) as Record<string, unknown>;
    return (customFields[key] as T | undefined) ?? null;
}

function getOrderLines(order: Order): Array<Record<string, any>> {
    const lines = (order as Order & { lines?: Array<Record<string, any>> }).lines;
    return Array.isArray(lines) ? lines : [];
}

function lineRequiresPersonalization(line: Record<string, any>): boolean {
    return line?.productVariant?.customFields?.requiresPersonalization === true;
}

function getLinePersonalizationStatus(line: Record<string, any>): string {
    return normalizeText(line?.customFields?.personalizationStatus);
}

function deriveOrderPersonalization(order: Order): { requiresPersonalization: boolean; overallStatus: string } {
    const lines = getOrderLines(order);
    if (lines.length > 0) {
        const requiredLines = lines.filter(lineRequiresPersonalization);
        if (requiredLines.length === 0) {
            return { requiresPersonalization: false, overallStatus: 'not-required' };
        }

        const completedLines = requiredLines.filter((line) =>
            ['uploaded', 'approved'].includes(getLinePersonalizationStatus(line)),
        );

        if (completedLines.length === 0) {
            return { requiresPersonalization: true, overallStatus: 'pending' };
        }
        if (completedLines.length < requiredLines.length) {
            return { requiresPersonalization: true, overallStatus: 'partial' };
        }
        return { requiresPersonalization: true, overallStatus: 'complete' };
    }

    const overallStatus = normalizeText(getCustomFieldValue<string>(order, 'personalizationOverallStatus'));
    if (['pending', 'partial', 'complete'].includes(overallStatus)) {
        return { requiresPersonalization: true, overallStatus };
    }
    return { requiresPersonalization: false, overallStatus: 'not-required' };
}

export function normalizeProductionStatus(value: unknown): OrderProductionStatus {
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

function isPaid(payment: Payment | undefined, order: Order): boolean {
    const paymentState = normalizeText(payment?.state);
    const orderState = normalizeText(order.state);
    return ['authorized', 'settled', 'approved'].includes(paymentState)
        || ['paymentauthorized', 'paymentsettled'].includes(orderState);
}

function isDelivered(order: Order): boolean {
    const shipmentState = normalizeText(getCustomFieldValue<string>(order, 'andreaniShipmentStatus'));
    return shipmentState.includes('deliver') || shipmentState.includes('entreg');
}

function isShipped(order: Order): boolean {
    const shipmentState = normalizeText(getCustomFieldValue<string>(order, 'andreaniShipmentStatus'));
    const trackingNumber = normalizeText(getCustomFieldValue<string>(order, 'andreaniTrackingNumber'));

    if (isDelivered(order)) {
        return true;
    }

    return Boolean(trackingNumber)
        || shipmentState.includes('ship')
        || shipmentState.includes('dispatch')
        || shipmentState.includes('enviado')
        || shipmentState.includes('transito')
        || shipmentState.includes('camino');
}

export function deriveOrderBusinessStatus(order: Order): OrderBusinessStatus {
    const lastPayment = order.payments?.[order.payments.length - 1];
    const personalization = deriveOrderPersonalization(order);
    const productionStatus = normalizeProductionStatus(getCustomFieldValue<string>(order, 'productionStatus'));

    if (normalizeText(order.state) === 'cancelled') {
        return 'cancelled';
    }
    if (!isPaid(lastPayment, order)) {
        return 'pending_payment';
    }
    if (isDelivered(order)) {
        return 'delivered';
    }
    if (isShipped(order)) {
        return 'shipped';
    }
    if (productionStatus === 'ready') {
        return 'ready_to_ship';
    }
    if (productionStatus === 'in-production') {
        return 'in_production';
    }
    if (personalization.requiresPersonalization && ['pending', 'partial'].includes(personalization.overallStatus)) {
        return 'awaiting_personalization';
    }
    if (personalization.requiresPersonalization && personalization.overallStatus === 'complete') {
        return 'personalization_received';
    }
    return 'paid';
}

export function getBusinessStatusLabel(status: OrderBusinessStatus): string {
    switch (status) {
        case 'pending_payment':
            return 'Pendiente de pago';
        case 'paid':
            return 'Pago confirmado';
        case 'awaiting_personalization':
            return 'Esperando personalización';
        case 'personalization_received':
            return 'Material recibido';
        case 'in_production':
            return 'En producción';
        case 'ready_to_ship':
            return 'Listo para enviar';
        case 'shipped':
            return 'Enviado';
        case 'delivered':
            return 'Entregado';
        case 'cancelled':
            return 'Cancelado';
    }
}

export function getProductionStatusLabel(value: unknown): string {
    const status = normalizeProductionStatus(value);
    if (status === 'in-production') {
        return 'En producción';
    }
    if (status === 'ready') {
        return 'Listo para enviar';
    }
    return 'Sin iniciar';
}
