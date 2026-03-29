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

export const paymentPersonalizationRequiredHandler = new EmailEventListener('payment-personalization-required')
    .on(OrderStateTransitionEvent)
    .filter(
        (event) =>
            event.toState === 'PaymentSettled'
            && event.fromState !== 'Modifying'
            && Boolean(event.order.customer?.emailAddress)
            && Boolean(getCustomFieldValue<boolean>(event.order, 'personalizationRequired')),
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
    .setTemplateVars((event) => ({
        order: event.order,
        customerName: getCustomerName(event.order),
        orderUrl: buildOrderUrl(event.order.code),
        businessStatusLabel: getBusinessStatusLabel(deriveOrderBusinessStatus(event.order)),
        uploadedAt: getCustomFieldValue<Date | string>(event.order, 'personalizationUploadedAt'),
        assetUrl:
            getCustomFieldValue<string>(event.order, 'personalizationAssetPreviewUrl')
            || ((getCustomFieldValue<Record<string, unknown>>(event.order, 'personalizationAsset') || {}).source as string | undefined)
            || null,
    }));

export const personalizationReceivedOperationsHandler = new EmailEventListener('personalization-received-operations')
    .on(PersonalizationReceivedEvent)
    .filter(() => Boolean(getOperationsEmail()))
    .setRecipient(() => getOperationsEmail()!)
    .setFrom('{{ fromAddress }}')
    .setSubject('Pedido #{{ order.code }} listo para revisar en producción')
    .setTemplateVars((event) => ({
        order: event.order,
        customerName: getCustomerName(event.order),
        customerEmail: event.order.customer?.emailAddress || getCustomFieldValue<string>(event.order, 'buyerEmail') || '-',
        businessStatusLabel: getBusinessStatusLabel(deriveOrderBusinessStatus(event.order)),
        uploadedAt: getCustomFieldValue<Date | string>(event.order, 'personalizationUploadedAt'),
        assetUrl:
            getCustomFieldValue<string>(event.order, 'personalizationAssetPreviewUrl')
            || ((getCustomFieldValue<Record<string, unknown>>(event.order, 'personalizationAsset') || {}).source as string | undefined)
            || null,
    }));

export const orderBusinessEmailHandlers = [
    paymentPersonalizationRequiredHandler,
    personalizationReceivedHandler,
    personalizationReceivedOperationsHandler,
];
