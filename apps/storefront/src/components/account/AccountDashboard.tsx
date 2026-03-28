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
    Stack,
    Typography,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PhotoCameraBackOutlinedIcon from '@mui/icons-material/PhotoCameraBackOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { getCustomerDashboard } from '@/lib/auth/client';
import { ANDREANI_ENABLED } from '@/lib/andreani/config';
import type { CustomerDashboardData, CustomerOrderSummary } from '@/types/customer-account';

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

function getPersonalizationLabel(order: CustomerOrderSummary): string {
    const status = order.personalization?.personalizationStatus ?? 'not-required';
    if (status === 'uploaded') {
        return 'Foto subida';
    }
    if (status === 'pending') {
        return 'Pendiente';
    }
    return 'No requerida';
}

function getPersonalizationColor(order: CustomerOrderSummary): 'default' | 'warning' | 'success' {
    const status = order.personalization?.personalizationStatus ?? 'not-required';
    if (status === 'uploaded') {
        return 'success';
    }
    if (status === 'pending') {
        return 'warning';
    }
    return 'default';
}

export default function AccountDashboard() {
    const [data, setData] = useState<CustomerDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = useEffectEvent(async () => {
        setIsLoading(true);
        const response = await getCustomerDashboard();

        if (!response.success || !response.data) {
            setData(null);
            setError(response.error || 'No se pudo cargar tu cuenta.');
            setIsLoading(false);
            return;
        }

        setData(response.data);
        setError(null);
        setIsLoading(false);
    });

    useEffect(() => {
        void loadDashboard();
    }, []);

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'var(--cla-brand-green)' }}>
                            Mi cuenta
                        </Typography>
                        <Typography color="text.secondary">
                            {ANDREANI_ENABLED
                                ? 'Revisá tus pedidos, el tracking de Andreani y la personalización pendiente o ya enviada.'
                                : 'Revisá tus pedidos y la personalización pendiente o ya enviada.'}
                        </Typography>
                    </Box>

                    {isLoading && (
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={22} />
                                    <Typography>Cargando tu dashboard...</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && error && (
                        <Alert
                            severity="warning"
                            action={(
                                <Button color="inherit" size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => void loadDashboard()}>
                                    Reintentar
                                </Button>
                            )}
                        >
                            {error}
                        </Alert>
                    )}

                    {!isLoading && data && (
                        <>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Typography variant="h5" fontWeight={700}>
                                            {data.customer.firstName || data.customer.lastName
                                                ? `${data.customer.firstName} ${data.customer.lastName}`.trim()
                                                : 'Cliente'}
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {data.customer.emailAddress}
                                        </Typography>
                                        {data.customer.phoneNumber && (
                                            <Typography color="text.secondary">
                                                {data.customer.phoneNumber}
                                            </Typography>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>

                            {data.orders.length === 0 ? (
                                <Alert severity="info">
                                    Todavía no hay pedidos asociados a esta cuenta.
                                </Alert>
                            ) : (
                                <Stack spacing={2.5}>
                                    {data.orders.map((order) => (
                                        <Card key={order.code} variant="outlined" sx={{ borderRadius: 3 }}>
                                            <CardContent>
                                                <Stack spacing={2}>
                                                    <Stack
                                                        direction={{ xs: 'column', md: 'row' }}
                                                        spacing={2}
                                                        justifyContent="space-between"
                                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                                    >
                                                        <Box>
                                                            <Typography variant="h5" fontWeight={700}>
                                                                Pedido {order.code}
                                                            </Typography>
                                                            <Typography color="text.secondary">
                                                                {formatDate(order.orderPlacedAt || order.createdAt)}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatMoney(order.totalWithTax, order.currencyCode)}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
                                                        <Chip icon={<ReceiptLongOutlinedIcon />} label={`Pago: ${order.payment.state || order.state}`} />
                                                        <Chip icon={<LocalShippingOutlinedIcon />} label={`Envío: ${order.shipmentState || 'Sin novedades'}`} />
                                                        <Chip icon={<PhotoCameraBackOutlinedIcon />} color={getPersonalizationColor(order)} label={`Personalización: ${getPersonalizationLabel(order)}`} />
                                                    </Stack>

                                                    <Divider />

                                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                                        <Box flex={1}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {order.items.length} producto(s) · {order.totalQuantity} unidad(es)
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Estado de la orden: {order.state}
                                                            </Typography>
                                                            {order.trackingCode && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Tracking: {order.trackingCode}
                                                                </Typography>
                                                            )}
                                                            {ANDREANI_ENABLED && order.logistics?.serviceName && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Servicio Andreani: {order.logistics.serviceName}
                                                                </Typography>
                                                            )}
                                                            {order.personalization?.originalFilename && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Archivo actual: {order.personalization.originalFilename}
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        {order.personalization?.assetPreviewUrl && (
                                                            <Box
                                                                component="img"
                                                                src={order.personalization.assetPreviewUrl}
                                                                alt={order.personalization.originalFilename || `Personalización ${order.code}`}
                                                                sx={{
                                                                    width: { xs: '100%', md: 140 },
                                                                    height: 140,
                                                                    objectFit: 'cover',
                                                                    borderRadius: 2,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>

                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                                        <Button
                                                            component={Link}
                                                            href={`/auth/orders/${encodeURIComponent(order.code)}`}
                                                            variant="contained"
                                                        >
                                                            Ver detalle
                                                        </Button>
                                                        {order.personalization?.requiresPersonalization && (
                                                            <Button
                                                                component={Link}
                                                                href={`/auth/orders/${encodeURIComponent(order.code)}#personalizacion`}
                                                                variant="outlined"
                                                                startIcon={<OpenInNewOutlinedIcon />}
                                                            >
                                                                Subir o reemplazar foto
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
