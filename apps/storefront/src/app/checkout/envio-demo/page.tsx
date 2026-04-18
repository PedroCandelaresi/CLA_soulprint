'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import {
    GET_ELIGIBLE_SHIPPING_METHODS_QUERY,
    fetchShopApi,
    getOperationResultMessage,
    type EligibleShippingMethodsResponse,
} from '@/lib/vendure/shop';
import type { EligibleShippingMethod } from '@/types/storefront';
import {
    buildDemoCheckoutUrl,
    formatCurrency,
    getDemoShippingEta,
    getSafeReturnPath,
} from '@/lib/checkout/demo';

type FeedbackState = {
    severity: 'error' | 'info';
    message: string;
};

export default function DemoShippingGatewayPage() {
    return (
        <Suspense
            fallback={
                <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
                    <Stack alignItems="center" py={10} spacing={2}>
                        <CircularProgress />
                        <Typography color="text.secondary">
                            Conectando con el operador logístico demo...
                        </Typography>
                    </Stack>
                </Container>
            }
        >
            <DemoShippingGatewayPageContent />
        </Suspense>
    );
}

function DemoShippingGatewayPageContent() {
    const searchParams = useSearchParams();
    const { activeOrder, initialized } = useStorefront();
    const [shippingMethod, setShippingMethod] = useState<EligibleShippingMethod | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    const shippingMethodId = searchParams.get('shippingMethodId');
    const returnTo = getSafeReturnPath(searchParams.get('returnTo'));

    useEffect(() => {
        if (!initialized) {
            return;
        }

        if (!activeOrder || activeOrder.lines.length === 0) {
            setFeedback({
                severity: 'error',
                message: 'No encontramos un pedido activo para cotizar el envío demo.',
            });
            setLoading(false);
            return;
        }

        if (!shippingMethodId) {
            setFeedback({
                severity: 'error',
                message: 'No se recibió un método de envío para confirmar.',
            });
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadShippingMethod = async () => {
            setLoading(true);
            setFeedback(null);

            try {
                const response = await fetchShopApi<EligibleShippingMethodsResponse>(
                    GET_ELIGIBLE_SHIPPING_METHODS_QUERY,
                );
                const selectedMethod =
                    response.eligibleShippingMethods.find((method) => method.id === shippingMethodId) || null;

                if (!cancelled) {
                    if (!selectedMethod) {
                        setFeedback({
                            severity: 'error',
                            message: 'El método de envío seleccionado ya no está disponible.',
                        });
                    }
                    setShippingMethod(selectedMethod);
                }
            } catch (error) {
                if (!cancelled) {
                    const result = getOperationResultMessage(error, 'No se pudo cotizar el envío demo.');
                    setFeedback({
                        severity: 'error',
                        message: result.message || 'No se pudo cotizar el envío demo.',
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadShippingMethod();

        return () => {
            cancelled = true;
        };
    }, [activeOrder, initialized, shippingMethodId]);

    const approveUrl = useMemo(
        () =>
            buildDemoCheckoutUrl(returnTo, {
                shippingApproved: '1',
                shippingMethodId: shippingMethodId || undefined,
            }),
        [returnTo, shippingMethodId],
    );

    const cancelUrl = useMemo(
        () =>
            buildDemoCheckoutUrl(returnTo, {
                shippingCanceled: '1',
            }),
        [returnTo],
    );

    const currencyCode = activeOrder?.currencyCode || 'ARS';
    const subtotalWithTax = activeOrder?.subTotalWithTax || 0;
    const shippingWithTax = shippingMethod?.priceWithTax || 0;
    const quotedTotal = subtotalWithTax + shippingWithTax;
    const shippingAddress = activeOrder?.shippingAddress;

    if (!initialized || loading) {
        return (
            <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
                <Stack alignItems="center" py={10} spacing={2}>
                    <CircularProgress />
                    <Typography color="text.secondary">Conectando con el operador logístico demo...</Typography>
                </Stack>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Stack spacing={3}>
                <Paper
                    elevation={0}
                    sx={{
                        overflow: 'hidden',
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        background:
                            'linear-gradient(135deg, rgba(33,33,33,1) 0%, rgba(47,52,58,1) 52%, rgba(225,106,0,0.92) 100%)',
                        color: 'common.white',
                        p: { xs: 3, md: 4 },
                    }}
                >
                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                            <Stack spacing={1}>
                                <Typography variant="overline" sx={{ letterSpacing: 2.5, opacity: 0.9 }}>
                                    Operador Logístico Demo
                                </Typography>
                                <Typography variant="h3" fontWeight={700}>
                                    Confirmación de Envío
                                </Typography>
                                <Typography sx={{ opacity: 0.82, maxWidth: 680 }}>
                                    Esta pantalla simula la validación externa del envío. Al aprobarla, el cargo se
                                    aplica al pedido real en Vendure y pasa al paso de pago.
                                </Typography>
                            </Stack>
                            <Chip
                                label="Sandbox"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    color: 'common.white',
                                    fontWeight: 700,
                                }}
                            />
                        </Stack>
                    </Stack>
                </Paper>

                {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
                    <Paper variant="outlined" sx={{ flex: 1, p: 3, borderRadius: 3 }}>
                        <Stack spacing={2.5}>
                            <Typography variant="h5" fontWeight={700}>
                                Resumen del despacho
                            </Typography>
                            <Divider />
                            <Stack spacing={1.5}>
                                <Typography variant="body2" color="text.secondary">
                                    Destinatario
                                </Typography>
                                <Typography fontWeight={600}>
                                    {shippingAddress?.fullName || 'Contacto de entrega pendiente'}
                                </Typography>
                                <Typography color="text.secondary">
                                    {[shippingAddress?.streetLine1, shippingAddress?.streetLine2]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Typography>
                                <Typography color="text.secondary">
                                    {[shippingAddress?.city, shippingAddress?.province, shippingAddress?.postalCode]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Typography>
                            </Stack>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: 'grey.50',
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Servicio seleccionado
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                        {shippingMethod?.name || 'Envío demo'}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {shippingMethod?.description || 'Entrega simulada para la demo comercial.'}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {getDemoShippingEta(shippingAddress?.province)}
                                    </Typography>
                                </Stack>
                            </Paper>
                            <Alert severity="info">
                                Al confirmar, la tarifa demo se suma al pedido y el cliente continúa a la pasarela de
                                pago real de Mercado Pago.
                            </Alert>
                        </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 360, p: 3, borderRadius: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h5" fontWeight={700}>
                                Cotización
                            </Typography>
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Subtotal del pedido</Typography>
                                <Typography fontWeight={600}>{formatCurrency(subtotalWithTax, currencyCode)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Tarifa de envío</Typography>
                                <Typography fontWeight={700}>{formatCurrency(shippingWithTax, currencyCode)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Total estimado</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {formatCurrency(quotedTotal, currencyCode)}
                                </Typography>
                            </Stack>
                            <Divider />
                            <Button
                                component={Link}
                                href={approveUrl}
                                variant="contained"
                                size="large"
                                disabled={!shippingMethod || !activeOrder}
                            >
                                Aprobar envío demo
                            </Button>
                            <Button component={Link} href={cancelUrl} variant="outlined" color="inherit">
                                Cancelar simulación
                            </Button>
                            <Button component={Link} href={returnTo} variant="text" color="inherit">
                                Volver al checkout
                            </Button>
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Container>
    );
}
