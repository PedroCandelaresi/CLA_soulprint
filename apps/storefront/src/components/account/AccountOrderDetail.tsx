'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import {
    Box,
    Button,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { CustomerOrderDetail as CustomerOrderDetailType } from '@/types/storefront';
import { useCustomerAccount } from './CustomerAccountProvider';
import {
    AccountEmptyState,
    AccountLoadingState,
    AccountProgress,
    AccountSectionCard,
    AccountStatusChip,
    AccountTimeline,
} from './AccountShared';
import {
    buildOrderTimeline,
    formatAccountCurrency,
    formatAccountDateTime,
    formatAddressLines,
    getFulfillmentStatusPresentation,
    getLatestFulfillment,
    getLatestPaymentForOrder,
    getOrderStatusPresentation,
    getPaymentStatusPresentation,
    getPrimaryPaymentMethod,
    getPrimaryShippingMethod,
    getTimelineProgressValue,
} from './accountPresentation';

function SummaryCard({
    label,
    value,
    helpText,
}: {
    label: string;
    value: string;
    helpText?: string;
}) {
    return (
        <AccountSectionCard sx={{ height: '100%' }}>
            <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                    {value}
                </Typography>
                {helpText && (
                    <Typography variant="body2" color="text.secondary">
                        {helpText}
                    </Typography>
                )}
            </Stack>
        </AccountSectionCard>
    );
}

function AddressCard({
    title,
    order,
    kind,
}: {
    title: string;
    order: CustomerOrderDetailType;
    kind: 'shipping' | 'billing';
}) {
    const address = kind === 'shipping' ? order.shippingAddress : order.billingAddress;

    return (
        <AccountSectionCard sx={{ height: '100%' }}>
            <Stack spacing={1.25}>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
                {address?.fullName && (
                    <Typography variant="body1" fontWeight={600}>
                        {address.fullName}
                    </Typography>
                )}
                {formatAddressLines(address).length ? (
                    <Stack spacing={0.5}>
                        {formatAddressLines(address).map((line) => (
                            <Typography key={line} variant="body2" color="text.secondary">
                                {line}
                            </Typography>
                        ))}
                    </Stack>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Sin información registrada para este pedido.
                    </Typography>
                )}
                {address?.phoneNumber && (
                    <Typography variant="body2" color="text.secondary">
                        Teléfono: {address.phoneNumber}
                    </Typography>
                )}
            </Stack>
        </AccountSectionCard>
    );
}

export default function AccountOrderDetail({ code }: { code: string }) {
    const { loadOrderDetail, orderDetailLoading, orderDetails } = useCustomerAccount();
    const order = orderDetails[code];
    const loading = orderDetailLoading[code];

    useEffect(() => {
        void loadOrderDetail(code);
    }, [code, loadOrderDetail]);

    if (loading && !order) {
        return (
            <AccountLoadingState
                title={`Cargando pedido ${code}`}
                message="Estamos trayendo el detalle completo, pago y envío."
            />
        );
    }

    if (!order) {
        return (
            <AccountEmptyState
                title="No encontramos ese pedido en tu cuenta"
                description="Puede haber cambiado de estado, no pertenecer a tu sesión actual o todavía no haberse sincronizado."
                action={
                    <Button component={Link} href="/mi-cuenta/pedidos" variant="contained">
                        Volver a mis pedidos
                    </Button>
                }
            />
        );
    }

    const orderStatus = getOrderStatusPresentation(order);
    const paymentStatus = getPaymentStatusPresentation(getLatestPaymentForOrder(order));
    const fulfillmentStatus = getFulfillmentStatusPresentation(getLatestFulfillment(order));
    const timeline = buildOrderTimeline(order);

    return (
        <Stack spacing={3}>
            <Stack spacing={1.5}>
                <Button
                    component={Link}
                    href="/mi-cuenta/pedidos"
                    variant="text"
                    color="inherit"
                    startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                    sx={{ alignSelf: 'flex-start', px: 0 }}
                >
                    Volver a pedidos
                </Button>

                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                >
                    <Stack spacing={0.75}>
                        <Typography variant="h4" fontWeight={700}>
                            Pedido {order.code}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Compra registrada el {formatAccountDateTime(order.orderPlacedAt || order.createdAt)}.
                        </Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                        <AccountStatusChip label={orderStatus.label} color={orderStatus.tone} />
                        <AccountStatusChip label={paymentStatus.label} color={paymentStatus.tone} />
                        <AccountStatusChip label={fulfillmentStatus.label} color={fulfillmentStatus.tone} />
                    </Stack>
                </Stack>
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
                <SummaryCard
                    label="Total del pedido"
                    value={formatAccountCurrency(order.totalWithTax, order.currencyCode)}
                    helpText={`${order.totalQuantity} producto${order.totalQuantity === 1 ? '' : 's'} en total`}
                />
                <SummaryCard
                    label="Subtotal"
                    value={formatAccountCurrency(order.subTotalWithTax, order.currencyCode)}
                    helpText="Importe de productos antes del envío."
                />
                <SummaryCard
                    label="Envío"
                    value={formatAccountCurrency(order.shippingWithTax, order.currencyCode)}
                    helpText={getPrimaryShippingMethod(order)}
                />
                <SummaryCard
                    label="Pago"
                    value={getPrimaryPaymentMethod(order)}
                    helpText={paymentStatus.description}
                />
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', xl: '1.3fr 0.7fr' },
                    alignItems: 'start',
                }}
            >
                <AccountSectionCard>
                    <Stack spacing={2.5}>
                        <Stack spacing={0.5}>
                            <Typography variant="h6" fontWeight={700}>
                                Productos comprados
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Detalle de líneas, variante comprada y subtotales.
                            </Typography>
                        </Stack>

                        <Stack spacing={0}>
                            {order.lines.map((line, index) => {
                                const image = line.featuredAsset?.preview || '/images/products/placeholder.png';

                                return (
                                    <Box key={line.id}>
                                        {index > 0 && <Divider flexItem />}
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={2}
                                            alignItems={{ xs: 'stretch', sm: 'center' }}
                                            py={2}
                                        >
                                            <Box
                                                sx={{
                                                    width: { xs: '100%', sm: 96 },
                                                    aspectRatio: '1 / 1',
                                                    position: 'relative',
                                                    borderRadius: 3,
                                                    overflow: 'hidden',
                                                    bgcolor: 'grey.100',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Image
                                                    src={image}
                                                    alt={line.productVariant.name}
                                                    fill
                                                    style={{ objectFit: 'contain', padding: '10px' }}
                                                />
                                            </Box>

                                            <Stack spacing={0.5} flex={1}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Inventory2OutlinedIcon fontSize="small" />
                                                    <Typography variant="body1" fontWeight={700}>
                                                        {line.productVariant.name}
                                                    </Typography>
                                                </Stack>
                                                {line.productVariant.sku && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        SKU: {line.productVariant.sku}
                                                    </Typography>
                                                )}
                                                <Typography variant="body2" color="text.secondary">
                                                    Cantidad: {line.quantity}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Unitario:{' '}
                                                    {formatAccountCurrency(
                                                        line.discountedUnitPriceWithTax || line.unitPriceWithTax,
                                                        order.currencyCode,
                                                    )}
                                                </Typography>
                                            </Stack>

                                            <Typography variant="h6" fontWeight={700}>
                                                {formatAccountCurrency(
                                                    line.discountedLinePriceWithTax || line.linePriceWithTax,
                                                    order.currencyCode,
                                                )}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Stack>
                </AccountSectionCard>

                <Stack spacing={2}>
                    <AccountSectionCard>
                        <Stack spacing={2}>
                            <Typography variant="h6" fontWeight={700}>
                                Progreso del pedido
                            </Typography>
                            <AccountProgress
                                label="Estado general"
                                value={getTimelineProgressValue(order)}
                                caption={orderStatus.description}
                            />
                            <AccountTimeline steps={timeline} />
                        </Stack>
                    </AccountSectionCard>

                    <AccountSectionCard>
                        <Stack spacing={1.5}>
                            <Typography variant="h6" fontWeight={700}>
                                Pago y envío
                            </Typography>
                            <Stack spacing={0.75}>
                                <Typography variant="body2" color="text.secondary">
                                    Medio de pago
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {getPrimaryPaymentMethod(order)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {paymentStatus.description}
                                </Typography>
                            </Stack>
                            <Divider />
                            <Stack spacing={0.75}>
                                <Typography variant="body2" color="text.secondary">
                                    Método de envío
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {getPrimaryShippingMethod(order)}
                                </Typography>
                                {getLatestFulfillment(order)?.method && (
                                    <Typography variant="body2" color="text.secondary">
                                        Operador logístico: {getLatestFulfillment(order)?.method}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                    {fulfillmentStatus.description}
                                </Typography>
                                {getLatestFulfillment(order)?.trackingCode && (
                                    <Typography variant="body2" color="text.secondary">
                                        Tracking: {getLatestFulfillment(order)?.trackingCode}
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    </AccountSectionCard>
                </Stack>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
                    alignItems: 'start',
                }}
            >
                <AddressCard title="Dirección de envío" order={order} kind="shipping" />
                <AddressCard title="Dirección de facturación" order={order} kind="billing" />
            </Box>

            {(order.couponCodes.length > 0 || order.discounts.length > 0) && (
                <AccountSectionCard>
                    <Stack spacing={1.25}>
                        <Typography variant="h6" fontWeight={700}>
                            Ajustes y descuentos
                        </Typography>
                        {order.couponCodes.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Códigos aplicados: {order.couponCodes.join(', ')}
                            </Typography>
                        )}
                        {order.discounts.map((discount) => (
                            <Stack key={`${discount.description}-${discount.amountWithTax}`} direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    {discount.description}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    -{formatAccountCurrency(discount.amountWithTax, order.currencyCode)}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </AccountSectionCard>
            )}
        </Stack>
    );
}
