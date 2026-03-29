'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { getCustomerOrder } from '@/lib/auth/client';
import { ANDREANI_ENABLED } from '@/lib/andreani/config';
import {
    deriveOrderBusinessStatus,
    getBusinessStatusPresentation,
    getProductionStatusLabel,
} from '@/lib/orders/business-status';
import OrderProgressTimeline from '@/components/orders/OrderProgressTimeline';
import OrderPersonalizationCard from '@/components/personalization/OrderPersonalizationCard';
import type { CustomerOrderDetailResponse, CustomerOrderSummary } from '@/types/customer-account';

interface OrderDetailViewProps {
    orderCode: string;
}

function formatDate(value: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatMoney(value: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
        maximumFractionDigits: 0,
    }).format(value / 100);
}

function AddressBlock({ title, address }: { title: string; address: CustomerOrderSummary['shippingAddress'] }) {
    if (!address) {
        return (
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                    <Typography fontWeight={700} gutterBottom>{title}</Typography>
                    <Typography color="text.secondary">Sin datos cargados.</Typography>
                </CardContent>
            </Card>
        );
    }

    const lines = [
        address.fullName,
        address.company,
        address.streetLine1,
        address.streetLine2,
        [address.city, address.province].filter(Boolean).join(', ') || null,
        [address.postalCode, address.country].filter(Boolean).join(' ') || null,
        address.phoneNumber,
    ].filter(Boolean);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
                <Typography fontWeight={700} gutterBottom>{title}</Typography>
                <Stack spacing={0.5}>
                    {lines.map((line) => (
                        <Typography key={line} color="text.secondary">{line}</Typography>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function OrderDetailView({ orderCode }: OrderDetailViewProps) {
    const [data, setData] = useState<CustomerOrderDetailResponse['data'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOrder = useEffectEvent(async () => {
        setIsLoading(true);
        const response = await getCustomerOrder(orderCode);
        if (!response.success || !response.data) {
            setData(null);
            setError(response.error || 'No se pudo cargar el pedido.');
            setIsLoading(false);
            return;
        }

        setData(response.data);
        setError(null);
        setIsLoading(false);
    });

    useEffect(() => {
        void loadOrder();
    }, [orderCode]);

    if (isLoading) {
        return (
            <Box sx={{ py: 6 }}>
                <Container maxWidth="lg">
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={22} />
                                <Typography>Cargando pedido...</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{ py: 6 }}>
                <Container maxWidth="lg">
                    <Stack spacing={2}>
                        <Button component={Link} href="/auth/account" startIcon={<ArrowBackOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
                            Volver a mi cuenta
                        </Button>
                        <Alert severity="warning">{error || 'No se encontró el pedido.'}</Alert>
                    </Stack>
                </Container>
            </Box>
        );
    }

    const { order } = data;
    const businessStatus = deriveOrderBusinessStatus(order);
    const statusPresentation = getBusinessStatusPresentation(businessStatus);

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Stack spacing={3}>
                    <Button component={Link} href="/auth/account" startIcon={<ArrowBackOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
                        Volver a mi cuenta
                    </Button>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems={{ xs: 'flex-start', md: 'center' }}
                                >
                                    <Box>
                                        <Typography variant="h4" fontWeight={700}>
                                            Pedido {order.code}
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {formatDate(order.orderPlacedAt || order.createdAt)}
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={700}>
                                        {formatMoney(order.totalWithTax, order.currencyCode)}
                                    </Typography>
                                </Stack>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
                                    <Chip color={statusPresentation.tone} label={`Estado: ${statusPresentation.label}`} />
                                    <Chip label={`Pago: ${order.payment.state || order.state}`} />
                                    <Chip label={`Envío: ${order.shipmentState || 'Aún no disponible'}`} />
                                    <Chip label={`Tracking: ${order.trackingCode || 'No disponible'}`} />
                                </Stack>

                                <Alert severity={statusPresentation.tone === 'default' ? 'info' : statusPresentation.tone}>
                                    {statusPresentation.description}
                                </Alert>

                                <Typography color="text.secondary">
                                    Cliente cuenta: {data.customer.firstName || data.customer.lastName
                                        ? `${data.customer.firstName} ${data.customer.lastName}`.trim()
                                        : data.customer.emailAddress}
                                </Typography>

                                {order.buyer?.fullName && (
                                    <Typography color="text.secondary">
                                        Comprador snapshot: {order.buyer.fullName}
                                    </Typography>
                                )}

                                {order.buyer?.email && (
                                    <Typography color="text.secondary">
                                        Email compra: {order.buyer.email}
                                    </Typography>
                                )}

                                {order.buyer?.phone && (
                                    <Typography color="text.secondary">
                                        Teléfono compra: {order.buyer.phone}
                                    </Typography>
                                )}

                                <Typography color="text.secondary">
                                    Producción: {getProductionStatusLabel(order.productionStatus)}
                                    {order.productionUpdatedAt ? ` · ${formatDate(order.productionUpdatedAt)}` : ''}
                                </Typography>

                                {ANDREANI_ENABLED && order.logistics?.serviceName && (
                                    <Typography color="text.secondary">
                                        Andreani: {order.logistics.serviceName}
                                        {order.logistics.shipmentStatus ? ` · ${order.logistics.shipmentStatus}` : ''}
                                    </Typography>
                                )}

                                {order.personalization?.assetUrl && (
                                    <Button
                                        component={Link}
                                        href={order.personalization.assetUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="outlined"
                                        startIcon={<OpenInNewOutlinedIcon />}
                                        sx={{ alignSelf: 'flex-start' }}
                                    >
                                        Abrir archivo cargado
                                    </Button>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Typography variant="h5" fontWeight={700}>
                                    Timeline del pedido
                                </Typography>
                                <OrderProgressTimeline order={order} />
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <AddressBlock title="Dirección de envío" address={order.shippingAddress} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <AddressBlock title="Dirección de facturación" address={order.billingAddress} />
                        </Grid>
                    </Grid>

                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Stack spacing={2.5}>
                                <Typography variant="h5" fontWeight={700}>
                                    Productos
                                </Typography>
                                {order.items.map((item) => (
                                    <Stack
                                        key={item.id}
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            {item.previewUrl && (
                                                <Box
                                                    component="img"
                                                    src={item.previewUrl}
                                                    alt={item.productName}
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        objectFit: 'cover',
                                                        borderRadius: 2,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                    }}
                                                />
                                            )}
                                            <Box>
                                                <Typography fontWeight={600}>
                                                    {item.productName}
                                                </Typography>
                                                <Typography color="text.secondary">
                                                    {item.variantName} · Cantidad: {item.quantity}
                                                </Typography>
                                                {item.requiresPersonalization && (
                                                    <Typography color="text.secondary">
                                                        Requiere foto para personalizar
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                        <Typography fontWeight={600}>
                                            {formatMoney(item.linePriceWithTax, order.currencyCode)}
                                        </Typography>
                                    </Stack>
                                ))}

                                {order.shippingLines.length > 0 && (
                                    <>
                                        <Divider />
                                        <Stack spacing={1}>
                                            <Typography fontWeight={700}>Envío</Typography>
                                            {order.shippingLines.map((line) => (
                                                <Typography key={`${line.name}-${line.priceWithTax}`} color="text.secondary">
                                                    {line.name}: {formatMoney(line.priceWithTax, order.currencyCode)}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    <Box id="personalizacion">
                        {order.personalization?.requiresPersonalization && order.personalization.personalizationStatus === 'pending' && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Falta la imagen de personalización. El pedido queda pendiente hasta que subas el archivo requerido.
                            </Alert>
                        )}
                        <OrderPersonalizationCard
                            orderCode={order.code}
                            initialAccessToken={order.personalization?.accessToken ?? null}
                            title="Personalización del pedido"
                        />
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}
