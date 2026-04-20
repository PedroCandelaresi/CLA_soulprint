'use client';

import Link from 'next/link';
import {
    Box,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
    formatAddressLines,
    getCustomerDisplayName,
    getLatestFulfillment,
    getOrderStatusPresentation,
} from './accountPresentation';
import TooltipButton from '@/components/ui/TooltipButton';

const quickLinks = [
    {
        href: '/mi-cuenta/pedidos',
        title: 'Mis pedidos',
        description: 'Revisá compras, estados y accesos al detalle.',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/seguimiento',
        title: 'Seguimiento',
        description: 'Controlá despachos, tracking y progreso de entrega.',
        icon: <LocalShippingOutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/direcciones',
        title: 'Direcciones',
        description: 'Gestioná destinos de envío y facturación.',
        icon: <HomeOutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/seguridad',
        title: 'Seguridad',
        description: 'Actualizá tu contraseña y el email de acceso.',
        icon: <LockOutlinedIcon fontSize="small" />,
    },
];

function AddressSnapshot({
    title,
    emptyText,
    lines,
}: {
    title: string;
    emptyText: string;
    lines: string[];
}) {
    return (
        <AccountSectionCard sx={{ height: '100%' }}>
            <Stack spacing={1.25}>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
                {lines.length ? (
                    <Stack spacing={0.6}>
                        {lines.map((line) => (
                            <Typography key={line} variant="body2" color="text.secondary">
                                {line}
                            </Typography>
                        ))}
                    </Stack>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {emptyText}
                    </Typography>
                )}
            </Stack>
        </AccountSectionCard>
    );
}

export default function AccountOverview() {
    const { accountError, customer, recentOrders, refreshAccount } = useCustomerAccount();

    if (accountError) {
        return (
            <AccountErrorState
                message={accountError}
                action={
                    <TooltipButton variant="outlined" onClick={() => void refreshAccount()} tooltip="Volver a intentar la carga de tu cuenta">
                        Reintentar carga
                    </TooltipButton>
                }
            />
        );
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="Todavía no encontramos tu cuenta"
                description="Iniciá sesión de nuevo para cargar tus datos o volvé al catálogo para continuar tu compra."
                action={
                    <TooltipButton href="/productos" variant="contained" tooltip="Volver al catálogo">
                        Ir al catálogo
                    </TooltipButton>
                }
            />
        );
    }

    const defaultShippingAddress = customer.addresses.find((address) => address.defaultShippingAddress);
    const defaultBillingAddress =
        customer.addresses.find((address) => address.defaultBillingAddress) || defaultShippingAddress;
    const ordersInTransit = customer.orders.filter((order) => Boolean(getLatestFulfillment(order)?.trackingCode)).length;
    const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalWithTax, 0);

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Resumen de cuenta
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {getCustomerDisplayName(customer)}, este es el panorama rápido de tu cuenta, tus pedidos y tus datos
                    guardados.
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        xl: 'repeat(4, minmax(0, 1fr))',
                    },
                }}
            >
                <AccountMetric
                    label="Pedidos totales"
                    value={String(customer.orders.length)}
                    helpText="Compras registradas en tu cuenta."
                />
                <AccountMetric
                    label="Direcciones guardadas"
                    value={String(customer.addresses.length)}
                    helpText="Usalas para acelerar futuras compras."
                />
                <AccountMetric
                    label="Envíos con seguimiento"
                    value={String(ordersInTransit)}
                    helpText="Pedidos con tracking o despacho informado."
                />
                <AccountMetric
                    label="Total histórico"
                    value={formatAccountCurrency(totalSpent, customer.orders[0]?.currencyCode || 'ARS')}
                    helpText="Monto acumulado de compras registradas."
                />
            </Box>

            <AccountSectionCard>
                <Stack spacing={2}>
                    <Stack spacing={0.5}>
                        <Typography variant="h6" fontWeight={700}>
                            Accesos rápidos
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Entrá directo a las acciones más habituales del área cliente.
                        </Typography>
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))',
                            },
                        }}
                    >
                        {quickLinks.map((item) => (
                            <TooltipButton
                                key={item.href}
                                href={item.href}
                                variant="outlined"
                                color="inherit"
                                endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
                                tooltip={`Abrir ${item.title}`}
                                sx={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    px: 2,
                                    py: 1.75,
                                    borderRadius: 3,
                                }}
                            >
                                <Stack spacing={0.5} alignItems="flex-start">
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {item.icon}
                                        <Typography fontWeight={700}>{item.title}</Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" textAlign="left">
                                        {item.description}
                                    </Typography>
                                </Stack>
                            </TooltipButton>
                        ))}
                    </Box>
                </Stack>
            </AccountSectionCard>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', xl: '1.3fr 0.7fr' },
                    alignItems: 'start',
                }}
            >
                <AccountSectionCard sx={{ height: '100%' }}>
                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            spacing={1}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                            <Stack spacing={0.5}>
                                <Typography variant="h6" fontWeight={700}>
                                    Últimos pedidos
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Los movimientos más recientes de tu historial.
                                </Typography>
                            </Stack>
                            <TooltipButton href="/mi-cuenta/pedidos" variant="text" tooltip="Ver el historial completo de pedidos">
                                Ver todos
                            </TooltipButton>
                        </Stack>

                        {recentOrders.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                Cuando completes una compra, vas a verla acá con su estado y acceso al detalle.
                            </Typography>
                        ) : (
                            <Stack divider={<Divider flexItem />} spacing={0}>
                                {recentOrders.map((order) => {
                                    const status = getOrderStatusPresentation(order);
                                    return (
                                        <Stack
                                            key={order.id}
                                            direction={{ xs: 'column', md: 'row' }}
                                            spacing={2}
                                            justifyContent="space-between"
                                            py={2}
                                        >
                                            <Stack spacing={0.5}>
                                                <Typography variant="body1" fontWeight={700}>
                                                    Pedido {order.code}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatAccountDate(order.orderPlacedAt || order.createdAt)} ·{' '}
                                                    {order.totalQuantity} producto{order.totalQuantity === 1 ? '' : 's'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Total {formatAccountCurrency(order.totalWithTax, order.currencyCode)}
                                                </Typography>
                                            </Stack>

                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            >
                                                <AccountStatusChip label={status.label} color={status.tone} />
                                                <TooltipButton
                                                    href={`/mi-cuenta/pedidos/${encodeURIComponent(order.code)}`}
                                                    variant="outlined"
                                                    tooltip={`Ver detalle del pedido ${order.code}`}
                                                >
                                                    Ver detalle
                                                </TooltipButton>
                                            </Stack>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Stack>
                </AccountSectionCard>

                <Stack spacing={2}>
                    <AddressSnapshot
                        title="Dirección de envío preferida"
                        emptyText="Todavía no guardaste una dirección de envío."
                        lines={formatAddressLines(defaultShippingAddress)}
                    />
                    <AddressSnapshot
                        title="Dirección de facturación preferida"
                        emptyText="Todavía no definiste una dirección de facturación."
                        lines={formatAddressLines(defaultBillingAddress)}
                    />
                </Stack>
            </Box>
        </Stack>
    );
}
