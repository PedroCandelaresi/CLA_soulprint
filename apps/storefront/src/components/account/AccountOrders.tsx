'use client';

import Link from 'next/link';
import {
    Box,
    Button,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useCustomerAccount } from './CustomerAccountProvider';
import {
    AccountEmptyState,
    AccountErrorState,
    AccountMetric,
    AccountSectionCard,
    AccountStatusChip,
} from './AccountShared';
import {
    formatAccountCurrency,
    formatAccountDate,
    getOrderStatusPresentation,
} from './accountPresentation';

export default function AccountOrders() {
    const { accountError, customer, orders } = useCustomerAccount();

    if (accountError) {
        return <AccountErrorState message={accountError} />;
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="No pudimos cargar tus pedidos"
                description="Volvé a iniciar sesión o refrescá la página para recuperar tu historial."
            />
        );
    }

    const averageTicket =
        orders.length > 0
            ? Math.round(orders.reduce((sum, order) => sum + order.totalWithTax, 0) / orders.length)
            : 0;
    const deliveredOrders = orders.filter(
        (order) => getOrderStatusPresentation(order).label === 'Entregado',
    ).length;

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Mis pedidos
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Un historial claro de tus compras, con acceso rápido al detalle de cada pedido.
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                }}
            >
                <AccountMetric label="Pedidos" value={String(orders.length)} helpText="Historial total en tu cuenta." />
                <AccountMetric
                    label="Entregados"
                    value={String(deliveredOrders)}
                    helpText="Pedidos cuyo envío figura entregado."
                />
                <AccountMetric
                    label="Ticket promedio"
                    value={formatAccountCurrency(averageTicket, orders[0]?.currencyCode || 'ARS')}
                    helpText="Promedio por pedido registrado."
                />
            </Box>

            {orders.length === 0 ? (
                <AccountEmptyState
                    title="Todavía no registrás compras"
                    description="Cuando completes un pedido, vas a poder seguirlo desde acá y consultar su detalle."
                    action={
                        <Button component={Link} href="/productos" variant="contained">
                            Explorar productos
                        </Button>
                    }
                />
            ) : (
                <AccountSectionCard>
                    <Stack spacing={0}>
                        {orders.map((order, index) => {
                            const status = getOrderStatusPresentation(order);

                            return (
                                <Box key={order.id}>
                                    {index > 0 && <Divider flexItem />}
                                    <Stack
                                        direction={{ xs: 'column', lg: 'row' }}
                                        spacing={2}
                                        justifyContent="space-between"
                                        py={2.5}
                                    >
                                        <Stack spacing={1} minWidth={0}>
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <ReceiptLongOutlinedIcon fontSize="small" />
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Pedido {order.code}
                                                    </Typography>
                                                </Stack>
                                                <AccountStatusChip label={status.label} color={status.tone} />
                                            </Stack>

                                            <Typography variant="body2" color="text.secondary">
                                                Realizado el {formatAccountDate(order.orderPlacedAt || order.createdAt)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {order.totalQuantity} producto{order.totalQuantity === 1 ? '' : 's'} ·{' '}
                                                Total {formatAccountCurrency(order.totalWithTax, order.currencyCode)}
                                            </Typography>
                                            {status.description && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {status.description}
                                                </Typography>
                                            )}
                                        </Stack>

                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            alignItems={{ xs: 'stretch', sm: 'center' }}
                                            justifyContent="flex-end"
                                        >
                                            <Button
                                                component={Link}
                                                href={`/mi-cuenta/pedidos/${encodeURIComponent(order.code)}`}
                                                variant="contained"
                                            >
                                                Ver detalle
                                            </Button>
                                            <Button component={Link} href="/mi-cuenta/seguimiento" variant="outlined">
                                                Ver seguimiento
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                </AccountSectionCard>
            )}
        </Stack>
    );
}
