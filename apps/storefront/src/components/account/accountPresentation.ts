import type { ChipProps } from '@mui/material';
import type {
    AccountCustomer,
    CustomerAddress,
    CustomerOrderDetail,
    CustomerOrderFulfillment,
    CustomerOrderPayment,
    CustomerOrderSummary,
    StorefrontOrderAddress,
} from '@/types/storefront';

type OrderLike = CustomerOrderSummary | CustomerOrderDetail;
type AddressLike = CustomerAddress | StorefrontOrderAddress;

export type AccountStatusTone = ChipProps['color'];

export interface StatusPresentation {
    label: string;
    tone: AccountStatusTone;
    description?: string;
}

export interface TimelineStep {
    key: string;
    label: string;
    description: string;
    state: 'complete' | 'current' | 'upcoming' | 'cancelled';
}

function isNonEmptyText(value?: string | null): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function splitIdentifier(raw: string): string[] {
    return raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(isNonEmptyText);
}

function toSentenceCase(raw?: string | null): string {
    if (!raw) {
        return 'Sin información';
    }

    return splitIdentifier(raw)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(' ');
}

function includesState(state: string | undefined | null, value: string): boolean {
    return (state ?? '').toLowerCase().includes(value.toLowerCase());
}

function isCancelledOrder(order: OrderLike): boolean {
    return includesState(order.state, 'cancel');
}

function getLatestPayment(order: OrderLike): CustomerOrderPayment | null {
    return [...order.payments].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )[0] ?? null;
}

export function getLatestFulfillment(order: OrderLike): CustomerOrderFulfillment | null {
    return [...order.fulfillments].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )[0] ?? null;
}

function isPaymentConfirmed(order: OrderLike): boolean {
    return order.payments.some(
        (payment) =>
            includesState(payment.state, 'settled') || includesState(payment.state, 'authorized'),
    );
}

function isDeliveryCompleted(order: OrderLike): boolean {
    return order.fulfillments.some((fulfillment) => includesState(fulfillment.state, 'deliver'));
}

function isShipmentDispatched(order: OrderLike): boolean {
    return order.fulfillments.some(
        (fulfillment) =>
            includesState(fulfillment.state, 'ship') ||
            includesState(fulfillment.state, 'dispatch') ||
            Boolean(fulfillment.trackingCode),
    );
}

export function formatAccountCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
    }).format(amount / 100);
}

export function formatAccountDate(value?: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
    }).format(new Date(value));
}

export function formatAccountDateTime(value?: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function getCustomerDisplayName(customer?: AccountCustomer | null): string {
    if (!customer) {
        return 'Cliente';
    }

    const fullName = [customer.firstName, customer.lastName]
        .filter(isNonEmptyText)
        .join(' ')
        .trim();
    return fullName || customer.emailAddress;
}

export function getCustomerInitials(customer?: AccountCustomer | null): string {
    const source = getCustomerDisplayName(customer);
    const letters = source
        .split(/\s+/)
        .slice(0, 2)
        .map((token) => token.charAt(0).toUpperCase())
        .join('');

    return letters || 'MC';
}

export function getOrderPlacedDate(order: OrderLike): string {
    return order.orderPlacedAt || order.createdAt;
}

export function getOrderStatusPresentation(order: OrderLike): StatusPresentation {
    if (isCancelledOrder(order)) {
        return {
            label: 'Cancelado',
            tone: 'error',
            description: 'El pedido fue cancelado y ya no seguirá avanzando.',
        };
    }

    if (isDeliveryCompleted(order)) {
        return {
            label: 'Entregado',
            tone: 'success',
            description: 'El envío figura como entregado.',
        };
    }

    if (isShipmentDispatched(order)) {
        const fulfillment = getLatestFulfillment(order);
        return {
            label: 'Despachado',
            tone: 'info',
            description: fulfillment?.trackingCode
                ? `Tracking ${fulfillment.trackingCode}`
                : 'Tu pedido ya salió a distribución.',
        };
    }

    if (isPaymentConfirmed(order)) {
        return {
            label: 'En preparación',
            tone: 'warning',
            description: 'El pago ya fue confirmado y estamos preparando el pedido.',
        };
    }

    if (order.active || includesState(order.state, 'payment')) {
        return {
            label: 'Pago pendiente',
            tone: 'default',
            description: 'Estamos esperando la confirmación final del pago.',
        };
    }

    return {
        label: 'Pedido recibido',
        tone: 'primary',
        description: 'Recibimos tu compra y la vamos a procesar enseguida.',
    };
}

export function getPaymentStatusPresentation(payment?: CustomerOrderPayment | null): StatusPresentation {
    if (!payment) {
        return {
            label: 'Sin pago registrado',
            tone: 'default',
            description: 'Todavía no figura un pago asociado al pedido.',
        };
    }

    if (includesState(payment.state, 'settled')) {
        return {
            label: 'Pago confirmado',
            tone: 'success',
            description: 'El cobro quedó acreditado correctamente.',
        };
    }

    if (includesState(payment.state, 'authorized')) {
        return {
            label: 'Pago en verificación',
            tone: 'info',
            description: 'El pago fue iniciado y seguimos esperando la confirmación final del medio de pago.',
        };
    }

    if (includesState(payment.state, 'declin') || includesState(payment.state, 'error')) {
        return {
            label: 'Pago con inconvenientes',
            tone: 'error',
            description: payment.errorMessage || 'Hubo un problema al procesar el pago.',
        };
    }

    return {
        label: toSentenceCase(payment.state),
        tone: 'default',
        description: `Estado reportado por el medio de pago: ${toSentenceCase(payment.state)}.`,
    };
}

export function getFulfillmentStatusPresentation(
    fulfillment?: CustomerOrderFulfillment | null,
): StatusPresentation {
    if (!fulfillment) {
        return {
            label: 'Pendiente de despacho',
            tone: 'default',
            description: 'Todavía no registramos un envío despachado.',
        };
    }

    if (includesState(fulfillment.state, 'deliver')) {
        return {
            label: 'Entregado',
            tone: 'success',
            description: 'El operador logístico informó la entrega del pedido.',
        };
    }

    if (includesState(fulfillment.state, 'ship') || includesState(fulfillment.state, 'dispatch')) {
        return {
            label: 'Despachado',
            tone: 'info',
            description: fulfillment.trackingCode
                ? `Tracking ${fulfillment.trackingCode}`
                : 'El envío ya salió a distribución.',
        };
    }

    return {
        label: 'En preparación',
        tone: 'warning',
        description: 'El pedido está siendo preparado para despacho.',
    };
}

export function buildOrderTimeline(order: OrderLike): TimelineStep[] {
    const receivedDescription = `Registramos tu pedido el ${formatAccountDateTime(
        getOrderPlacedDate(order),
    )}.`;

    if (isCancelledOrder(order)) {
        return [
            {
                key: 'received',
                label: 'Pedido recibido',
                description: receivedDescription,
                state: 'complete',
            },
            {
                key: 'cancelled',
                label: 'Cancelado',
                description: 'El pedido fue cancelado. Si necesitás ayuda, podés contactarnos con el número de pedido.',
                state: 'cancelled',
            },
        ];
    }

    const paymentConfirmed = isPaymentConfirmed(order);
    const shipped = isShipmentDispatched(order);
    const delivered = isDeliveryCompleted(order);
    const latestFulfillment = getLatestFulfillment(order);

    return [
        {
            key: 'received',
            label: 'Pedido recibido',
            description: receivedDescription,
            state: 'complete',
        },
        {
            key: 'paid',
            label: 'Pago confirmado',
            description: paymentConfirmed
                ? 'El pago quedó validado y el pedido entró en preparación.'
                : 'Estamos esperando la validación final del pago.',
            state: paymentConfirmed ? 'complete' : 'current',
        },
        {
            key: 'preparing',
            label: 'En preparación',
            description: paymentConfirmed
                ? 'Estamos armando y verificando tu pedido antes del despacho.'
                : 'Se habilita cuando el pago quede confirmado.',
            state: shipped ? 'complete' : paymentConfirmed ? 'current' : 'upcoming',
        },
        {
            key: 'shipped',
            label: 'Despachado',
            description: shipped
                ? latestFulfillment?.trackingCode
                    ? `Tu paquete salió a distribución. Tracking: ${latestFulfillment.trackingCode}.`
                    : 'Tu paquete ya salió a distribución.'
                : 'Todavía no registramos el despacho del pedido.',
            state: delivered ? 'complete' : shipped ? 'current' : 'upcoming',
        },
        {
            key: 'delivered',
            label: 'Entregado',
            description: delivered
                ? 'El envío figura como entregado.'
                : 'Aparecerá cuando la entrega se confirme.',
            state: delivered ? 'complete' : 'upcoming',
        },
    ];
}

export function getTimelineProgressValue(order: OrderLike): number {
    const timeline = buildOrderTimeline(order);
    const currentIndex = timeline.findIndex((step) => step.state === 'current' || step.state === 'cancelled');
    const completeSteps = timeline.filter((step) => step.state === 'complete').length;

    if (timeline.length === 0) {
        return 0;
    }

    if (currentIndex >= 0) {
        return Math.round((currentIndex / Math.max(timeline.length - 1, 1)) * 100);
    }

    return Math.round((completeSteps / timeline.length) * 100);
}

export function formatAddressLines(address?: AddressLike | null): string[] {
    if (!address) {
        return [];
    }

    const countryLabel =
        typeof address.country === 'string' ? address.country : address.country?.name;

    const lines = [
        [address.streetLine1, address.streetLine2].filter(isNonEmptyText).join(', '),
        [address.city, address.province, address.postalCode].filter(isNonEmptyText).join(', '),
        countryLabel,
    ];

    return lines.filter(isNonEmptyText);
}

export function getPrimaryShippingMethod(order: OrderLike): string {
    return order.shippingLines[0]?.shippingMethod.name || 'Sin método informado';
}

export function getPrimaryPaymentMethod(order: OrderLike): string {
    return getLatestPayment(order)?.method || 'Sin medio informado';
}

export function getLatestPaymentForOrder(order: OrderLike): CustomerOrderPayment | null {
    return getLatestPayment(order);
}
