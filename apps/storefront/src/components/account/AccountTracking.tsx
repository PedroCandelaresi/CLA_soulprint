'use client';

import Link from 'next/link';
import {
    Button,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import { useCustomerAccount } from './CustomerAccountProvider';
import {
    AccountEmptyState,
    AccountErrorState,
    AccountProgress,
    AccountSectionCard,
    AccountStatusChip,
} from './AccountShared';
import {
    formatAccountDate,
    getFulfillmentStatusPresentation,
    getLatestFulfillment,
    getOrderStatusPresentation,
    getPrimaryShippingMethod,
    getTimelineProgressValue,
} from './accountPresentation';

export default function AccountTracking() {
    const { accountError, customer, orders } = useCustomerAccount();

    if (accountError) {
        return <AccountErrorState message={accountError} />;
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="No pudimos preparar el seguimiento"
                description="Intentá nuevamente en unos segundos para revisar el estado de tus envíos."
            />
        );
    }

    if (orders.length === 0) {
        return (
            <AccountEmptyState
                title="Todavía no hay envíos para seguir"
                description="Cuando completes una compra, vas a ver acá el progreso del pedido y cualquier tracking disponible."
                action={
                    <Button component={Link} href="/productos" variant="contained">
                        Ver catálogo
                    </Button>
                }
            />
        );
    }

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Seguimiento
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Un resumen de despacho y entrega pensado para clientes, sin exponer estados técnicos crudos.
                </Typography>
            </Stack>

            <AccountSectionCard>
                <Stack spacing={0}>
                    {orders.map((order, index) => {
                        const latestFulfillment = getLatestFulfillment(order);
                        const shippingStatus = getFulfillmentStatusPresentation(latestFulfillment);
                        const orderStatus = getOrderStatusPresentation(order);

                        return (
                            <Stack key={order.id} spacing={2.5} py={2.5}>
                                {index > 0 && <Divider flexItem />}
                                <Stack
                                    direction={{ xs: 'column', lg: 'row' }}
                                    spacing={2}
                                    justifyContent="space-between"
                                >
                                    <Stack spacing={1} minWidth={0}>
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        >
                                            <Typography variant="h6" fontWeight={700}>
                                                Pedido {order.code}
                                            </Typography>
                                            <AccountStatusChip label={orderStatus.label} color={orderStatus.tone} />
                                            <AccountStatusChip
                                                label={shippingStatus.label}
                                                color={shippingStatus.tone}
                                            />
                                        </Stack>

                                        <Typography variant="body2" color="text.secondary">
                                            Compra registrada el {formatAccountDate(order.orderPlacedAt || order.createdAt)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Método de envío: {getPrimaryShippingMethod(order)}
                                        </Typography>
                                        {latestFulfillment?.method && (
                                            <Typography variant="body2" color="text.secondary">
                                                Operador logístico: {latestFulfillment.method}
                                            </Typography>
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            {latestFulfillment?.trackingCode
                                                ? `Tracking: ${latestFulfillment.trackingCode}`
                                                : 'Aún no hay tracking disponible para este pedido.'}
                                        </Typography>
                                    </Stack>

                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                        alignItems={{ xs: 'stretch', sm: 'center' }}
                                    >
                                        <Button
                                            component={Link}
                                            href={`/mi-cuenta/pedidos/${encodeURIComponent(order.code)}`}
                                            variant="contained"
                                        >
                                            Ver pedido
                                        </Button>
                                    </Stack>
                                </Stack>

                                <AccountProgress
                                    label="Progreso del pedido"
                                    value={getTimelineProgressValue(order)}
                                    caption={shippingStatus.description || orderStatus.description}
                                />
                            </Stack>
                        );
                    })}
                </Stack>
            </AccountSectionCard>
        </Stack>
    );
}
