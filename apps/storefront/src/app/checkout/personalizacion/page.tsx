'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Alert,
    Button,
    Chip,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { PersonalizationUploadPanel } from '@/components/checkout/PersonalizationUploadPanel';
import { formatCurrency } from '@/lib/checkout/demo';
import {
    fetchPersonalizationOrder,
    uploadPersonalizationFile,
} from '@/lib/personalization/client';
import type {
    PersonalizationLineData,
    PersonalizationOrderData,
} from '@/lib/personalization/types';
import {
    fetchShopApi,
    GET_ORDER_BY_CODE_QUERY,
    getOperationResultMessage,
    type OrderByCodeResponse,
} from '@/lib/vendure/shop';
import type { ActiveOrder, StorefrontOrderPayment } from '@/types/storefront';

const PERSONALIZATION_ORDER_CODE_STORAGE_KEY = 'personalization:last-order-code';

function getLatestPayment(order: ActiveOrder | null | undefined): StorefrontOrderPayment | null {
    const payments = order?.payments ?? [];

    if (payments.length === 0) {
        return null;
    }

    return [...payments].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0] ?? null;
}

export default function CheckoutPersonalizationPage() {
    return (
        <Suspense
            fallback={
                <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
                    <Stack alignItems="center" py={10} spacing={2}>
                        <CircularProgress />
                        <Typography color="text.secondary">Preparando la carga del archivo...</Typography>
                    </Stack>
                </Container>
            }
        >
            <CheckoutPersonalizationContent />
        </Suspense>
    );
}

function CheckoutPersonalizationContent() {
    const searchParams = useSearchParams();
    const hintedOrderCode = searchParams.get('order')?.trim() || null;
    const paymentMethod = searchParams.get('method')?.trim() || null;
    const [orderCode, setOrderCode] = useState<string | null>(hintedOrderCode);
    const [order, setOrder] = useState<ActiveOrder | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [personalization, setPersonalization] = useState<PersonalizationOrderData | null>(null);
    const [personalizationLoading, setPersonalizationLoading] = useState(false);
    const [personalizationError, setPersonalizationError] = useState<string | null>(null);
    const [personalizationUploadingLineId, setPersonalizationUploadingLineId] = useState<string | null>(null);
    const latestPayment = useMemo(() => getLatestPayment(order), [order]);
    const currencyCode = order?.currencyCode || 'ARS';

    const loadPersonalizationStatus = useCallback(
        async (code: string) => {
            setPersonalizationLoading(true);

            try {
                const data = await fetchPersonalizationOrder(code, {
                    accessToken: personalization?.accessToken,
                });

                setPersonalization(data);
                setPersonalizationError(null);
            } catch (error) {
                setPersonalizationError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'No pudimos consultar si este pedido requiere personalización.',
                );
            } finally {
                setPersonalizationLoading(false);
            }
        },
        [personalization?.accessToken],
    );

    const loadOrder = useCallback(
        async (code: string) => {
            setLoadingOrder(true);
            setOrderError(null);

            try {
                const response = await fetchShopApi<OrderByCodeResponse>(GET_ORDER_BY_CODE_QUERY, {
                    code,
                });
                setOrder(response.orderByCode ?? null);
                await loadPersonalizationStatus(code);
            } catch (error) {
                const result = getOperationResultMessage(
                    error,
                    'No pudimos consultar el pedido en Vendure.',
                );
                setOrderError(result.message || 'No pudimos consultar el pedido en Vendure.');
            } finally {
                setLoadingOrder(false);
            }
        },
        [loadPersonalizationStatus],
    );

    const handlePersonalizationUpload = useCallback(
        async (line: PersonalizationLineData, side: 'front' | 'back', file: File, notes: string) => {
            if (!orderCode) return;

            setPersonalizationUploadingLineId(`${line.orderLineId}:${side}`);
            setPersonalizationError(null);

            try {
                const data = await uploadPersonalizationFile({
                    orderCode,
                    orderLineId: line.orderLineId,
                    side,
                    file,
                    notes,
                    accessToken: personalization?.accessToken,
                });
                setPersonalization(data);
            } catch (error) {
                setPersonalizationError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'No pudimos subir el archivo de personalización.',
                );
            } finally {
                setPersonalizationUploadingLineId(null);
            }
        },
        [orderCode, personalization?.accessToken],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (hintedOrderCode) {
            window.sessionStorage.setItem(PERSONALIZATION_ORDER_CODE_STORAGE_KEY, hintedOrderCode);
            setOrderCode(hintedOrderCode);
            return;
        }

        setOrderCode(window.sessionStorage.getItem(PERSONALIZATION_ORDER_CODE_STORAGE_KEY) || null);
    }, [hintedOrderCode]);

    useEffect(() => {
        if (!orderCode) {
            return;
        }

        void loadOrder(orderCode);
    }, [loadOrder, orderCode]);

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Stack spacing={3}>
                <Stack spacing={1}>
                    <Typography variant="h3" fontWeight={800}>
                        Cargá la foto para personalizar
                    </Typography>
                    <Typography color="text.secondary">
                        Ya registramos tu selección de pago. Para avanzar con el pedido, subí el archivo del producto personalizado.
                    </Typography>
                </Stack>

                {paymentMethod === 'transferencia-bancaria' && (
                    <Alert severity="info">
                        Si elegiste transferencia, podés cargar la foto ahora. La acreditación se revisa después desde Vendure.
                    </Alert>
                )}

                {!orderCode && (
                    <Alert severity="warning">
                        No pudimos identificar el pedido. Volvé al carrito para retomar la compra.
                    </Alert>
                )}

                {orderError && <Alert severity="error">{orderError}</Alert>}

                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
                    <Stack spacing={3} flex={1} width="100%">
                        {loadingOrder && (
                            <Alert severity="info" icon={<CircularProgress size={18} />}>
                                Consultando el pedido...
                            </Alert>
                        )}

                        {order && (
                            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                                <Stack spacing={1.25}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Chip label={`Pedido ${order.code}`} variant="outlined" />
                                        <Chip label={`Orden ${order.state}`} variant="outlined" />
                                        {latestPayment && (
                                            <Chip label={`Pago ${latestPayment.state}`} variant="outlined" />
                                        )}
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Total</Typography>
                                        <Typography variant="h6" fontWeight={800}>
                                            {formatCurrency(order.totalWithTax, currencyCode)}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Paper>
                        )}

                        {orderCode && (
                            <PersonalizationUploadPanel
                                data={personalization}
                                loading={personalizationLoading}
                                error={personalizationError}
                                uploadingLineId={personalizationUploadingLineId}
                                onReload={() => {
                                    void loadPersonalizationStatus(orderCode);
                                }}
                                onUpload={handlePersonalizationUpload}
                            />
                        )}
                    </Stack>

                    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 360, p: 3, borderRadius: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h5" fontWeight={800}>
                                Próximo paso
                            </Typography>
                            <Typography color="text.secondary">
                                Cuando el archivo quede cargado, lo vas a ver asociado al pedido en el panel de Vendure.
                            </Typography>
                            {orderCode && personalization?.overallPersonalizationStatus === 'complete' && (
                                <Button
                                    component={Link}
                                    href={`/mi-cuenta/pedidos/${orderCode}`}
                                    variant="contained"
                                    color="success"
                                >
                                    Ver mi pedido
                                </Button>
                            )}
                            <Button component={Link} href="/checkout" variant="outlined">
                                Volver al checkout
                            </Button>
                            <Button component={Link} href="/carrito" variant="text">
                                Ir al carrito
                            </Button>
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Container>
    );
}

