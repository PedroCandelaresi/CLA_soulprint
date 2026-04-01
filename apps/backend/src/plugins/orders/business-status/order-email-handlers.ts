import { OrderStateTransitionEvent, Order } from '@vendure/core';
import { EmailEventListener } from '@vendure/email-plugin';
import { deriveOrderBusinessStatus, getBusinessStatusLabel } from './order-business-status';
import { PersonalizationReceivedEvent } from './personalization-received.event';

function getCustomFieldValue<T>(order: Order, key: string): T | null {
    const customFields = (order.customFields || {}) as Record<string, unknown>;
    return (customFields[key] as T | undefined) ?? null;
}

function buildOrderUrl(orderCode: string): string {
    const baseUrl = (process.env.SHOP_PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${baseUrl}/auth/orders/${encodeURIComponent(orderCode)}`;
}

function getOperationsEmail(): string | null {
    const value = (process.env.OPERATIONS_NOTIFICATION_EMAIL || '').trim();
    return value || null;
}

function getCustomerName(order: Order): string {
    const customer = order.customer;
    if (!customer) {
        return 'cliente';
    }
    const parts = [customer.firstName, customer.lastName].filter(Boolean);
    return parts.join(' ').trim() || customer.emailAddress || 'cliente';
}

function orderNeedsPersonalization(order: Order): boolean {
    return deriveOrderBusinessStatus(order) === 'awaiting_personalization';
}

function getLineCustomFieldValue<T>(line: Order['lines'][number] | null, key: string): T | null {
    const customFields = (line?.customFields || {}) as Record<string, unknown>;
    return (customFields[key] as T | undefined) ?? null;
}

function lineRequiresPersonalization(line: Order['lines'][number] | null): boolean {
    const variantCustomFields = (line?.productVariant?.customFields || {}) as Record<string, unknown>;
    return variantCustomFields.requiresPersonalization === true;
}

function getRelevantPersonalizationLine(order: Order, orderLineId: string | null) {
    const lines = Array.isArray(order.lines) ? order.lines : [];
    const selectedLine = orderLineId
        ? lines.find((line) => String(line.id) === String(orderLineId))
        : null;

    if (selectedLine) {
        return selectedLine;
    }

    return (
        lines.find((line) => Boolean(getLineCustomFieldValue(line, 'personalizationAsset')))
        ?? lines.find((line) => lineRequiresPersonalization(line))
        ?? null
    );
}

function getLineAssetUrl(line: Order['lines'][number] | null): string | null {
    const asset = getLineCustomFieldValue<Record<string, unknown>>(line, 'personalizationAsset');
    if (!asset || typeof asset !== 'object') {
        return null;
    }

    const source = (asset as Record<string, unknown>).source;
    const preview = (asset as Record<string, unknown>).preview;
    return (typeof source === 'string' && source) || (typeof preview === 'string' && preview) || null;
}

function getLineUploadedAt(line: Order['lines'][number] | null): Date | string | null {
    return getLineCustomFieldValue<Date | string>(line, 'personalizationUploadedAt');
}

export const paymentPersonalizationRequiredHandler = new EmailEventListener('payment-personalization-required')
    .on(OrderStateTransitionEvent)
    .filter(
        (event) =>
            event.toState === 'PaymentSettled'
            && event.fromState !== 'Modifying'
            && Boolean(event.order.customer?.emailAddress)
            && orderNeedsPersonalization(event.order),
    )
    .setRecipient((event) => event.order.customer!.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setSubject('Subí la imagen de tu pedido #{{ order.code }}')
    .setTemplateVars((event) => ({
        order: event.order,
        customerName: getCustomerName(event.order),
        orderUrl: buildOrderUrl(event.order.code),
        businessStatusLabel: getBusinessStatusLabel(deriveOrderBusinessStatus(event.order)),
    }));

export const personalizationReceivedHandler = new EmailEventListener('personalization-received')
    .on(PersonalizationReceivedEvent)
    .filter((event) => Boolean(event.order.customer?.emailAddress))
    .setRecipient((event) => event.order.customer!.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setSubject('Recibimos tu archivo para el pedido #{{ order.code }}')
    .setTemplateVars((event) => {
        const line = getRelevantPersonalizationLine(event.order, event.orderLineId);
        return {
            order: event.order,
            customerName: getCustomerName(event.order),
            orderUrl: buildOrderUrl(event.order.code),
            businessStatusLabel: getBusinessStatusLabel(deriveOrderBusinessStatus(event.order)),
            uploadedAt: getLineUploadedAt(line),
            assetUrl: getLineAssetUrl(line),
        };
    });

export const personalizationReceivedOperationsHandler = new EmailEventListener('personalization-received-operations')
    .on(PersonalizationReceivedEvent)
    .filter(() => Boolean(getOperationsEmail()))
    .setRecipient(() => getOperationsEmail()!)
    .setFrom('{{ fromAddress }}')
    .setSubject('Pedido #{{ order.code }} listo para revisar en producción')
    .setTemplateVars((event) => {
        const line = getRelevantPersonalizationLine(event.order, event.orderLineId);
        return {
            order: event.order,
            customerName: getCustomerName(event.order),
            customerEmail: event.order.customer?.emailAddress || getCustomFieldValue<string>(event.order, 'buyerEmail') || '-',
            businessStatusLabel: getBusinessStatusLabel(deriveOrderBusinessStatus(event.order)),
            uploadedAt: getLineUploadedAt(line),
            assetUrl: getLineAssetUrl(line),
        };
    });

export const orderBusinessEmailHandlers = [
    paymentPersonalizationRequiredHandler,
    personalizationReceivedHandler,
    personalizationReceivedOperationsHandler,
];
