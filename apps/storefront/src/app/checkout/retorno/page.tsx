'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { formatCurrency } from '@/lib/checkout/demo';
import { PersonalizationUploadPanel } from '@/components/checkout/PersonalizationUploadPanel';
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
    RETRY_MERCADOPAGO_PAYMENT_MUTATION,
    type OrderByCodeResponse,
    type RetryMercadoPagoPaymentResponse,
} from '@/lib/vendure/shop';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import type {
    ActiveOrder,
    StorefrontOrderPayment,
    StorefrontPaymentMetadata,
    StorefrontPaymentMetadataPublic,
} from '@/types/storefront';

const MERCADOPAGO_ORDER_CODE_STORAGE_KEY = 'mercadopago:last-order-code';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

type ReturnStatus =
    | 'loading'
    | 'confirmed'
    | 'pending'
    | 'verifying'
    | 'rejected'
    | 'cancelled'
    | 'missing'
    | 'error';

type ReturnHints = {
    externalReference: string | null;
    paymentId: string | null;
    result: string | null;
};

type FeedbackState = {
    severity: 'success' | 'info' | 'warning' | 'error';
    message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getPaymentMetadata(payment: StorefrontOrderPayment | null | undefined): StorefrontPaymentMetadata | null {
    if (!isRecord(payment?.metadata)) {
        return null;
    }

    return payment.metadata as StorefrontPaymentMetadata;
}

function getPublicPaymentMetadata(
    payment: StorefrontOrderPayment | null | undefined,
): StorefrontPaymentMetadataPublic | null {
    const metadata = getPaymentMetadata(payment)?.public;

    if (!isRecord(metadata)) {
        return null;
    }

    return metadata as StorefrontPaymentMetadataPublic;
}

function getLatestPayment(order: ActiveOrder | null | undefined): StorefrontOrderPayment | null {
    const payments = order?.payments ?? [];

    if (payments.length === 0) {
        return null;
    }

    return [...payments].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0] ?? null;
}

function normalizeStatus(value: string | null | undefined): string | null {
    const normalizedValue = value?.trim().toLowerCase() || null;
    return normalizedValue || null;
}

function isRejectedReturnStatus(value: string | null | undefined): boolean {
    const status = normalizeStatus(value);
    return status === 'failure' || status === 'failed' || status === 'rejected' || status === 'declined';
}

function isCancelledReturnStatus(value: string | null | undefined): boolean {
    const status = normalizeStatus(value);
    return status === 'cancelled' || status === 'cancel' || status === 'null';
}

function isRejectedProviderStatus(payment: StorefrontOrderPayment | null): boolean {
    const providerStatus = normalizeStatus(getPublicPaymentMetadata(payment)?.status);
    return isRejectedReturnStatus(providerStatus);
}

function isReadyPaymentState(payment: StorefrontOrderPayment | null): boolean {
    return payment?.state === 'Authorized' || payment?.state === 'Settled';
}

function isPaymentConfirmed(payment: StorefrontOrderPayment | null): boolean {
    return isReadyPaymentState(payment);
}

function isPaymentCancelled(payment: StorefrontOrderPayment | null): boolean {
    return payment?.state === 'Cancelled';
}

function isPaymentRejected(payment: StorefrontOrderPayment | null): boolean {
    return payment?.state === 'Declined' || payment?.state === 'Error';
}

function isPaymentPending(payment: StorefrontOrderPayment | null): boolean {
    if (payment?.state !== 'Authorized') {
        return false;
    }

    const providerStatus = normalizeStatus(getPublicPaymentMetadata(payment)?.status);

    return (
        providerStatus === 'pending' ||
        providerStatus === 'in_process' ||
        providerStatus === 'authorized'
    );
}

function isPaymentStillVerifying(payment: StorefrontOrderPayment | null): boolean {
    return payment?.state === 'Authorized' && !isPaymentPending(payment);
}

function getMercadoPagoRedirectUrl(order: ActiveOrder | null | undefined): string | null {
    const payment = getLatestPayment(order);
    const metadata = getPublicPaymentMetadata(payment);
    const environment = metadata?.environment;

    if (environment === 'production') {
        return metadata?.initPoint || metadata?.sandboxInitPoint || null;
    }

    return metadata?.sandboxInitPoint || metadata?.initPoint || null;
}

function canRetryPayment(payment: StorefrontOrderPayment | null): boolean {
    return isPaymentRejected(payment) || isPaymentCancelled(payment);
}

function canForceRetryPayment(
    payment: StorefrontOrderPayment | null,
    pollingTimedOut: boolean,
): boolean {
    if (payment?.state !== 'Authorized') {
        return false;
    }

    if (isPaymentPending(payment)) {
        return false;
    }

    return pollingTimedOut;
}

function getStatusCopy(status: ReturnStatus): {
    title: string;
    severity: 'success' | 'info' | 'warning' | 'error';
    description: string;
} {
    if (status === 'confirmed') {
        return {
            title: 'Continuá con la foto',
            severity: 'success',
            description: 'El medio de pago no informó rechazo. Antes de cerrar el pedido, subí el archivo de personalización.',
        };
    }

    if (status === 'pending') {
        return {
            title: 'Pago pendiente de acreditación',
            severity: 'info',
            description: 'Podés cargar el archivo mientras esperamos la acreditación final del pago.',
        };
    }

    if (status === 'rejected') {
        return {
            title: 'Pago rechazado',
            severity: 'error',
            description: 'El medio de pago rechazó la operación. Volvé al checkout para elegir otro medio o reintentar.',
        };
    }

    if (status === 'cancelled') {
        return {
            title: 'Pago cancelado',
            severity: 'warning',
            description: 'El intento de pago fue cancelado y la orden todavía no quedó cobrada.',
        };
    }

    if (status === 'verifying') {
        return {
            title: 'Verificando pago',
            severity: 'info',
            description: 'Todavía estamos esperando la confirmación final del pago.',
        };
    }

    if (status === 'missing') {
        return {
            title: 'No pudimos identificar el pedido',
            severity: 'warning',
            description: 'Necesitamos identificar el pedido para consultar su estado.',
        };
    }

    if (status === 'error') {
        return {
            title: 'No pudimos confirmar el estado final',
            severity: 'error',
            description: 'No pudimos validar el pago. Podés volver al checkout o generar un nuevo intento.',
        };
    }

    return {
        title: 'Consultando pedido',
        severity: 'info',
        description: 'Estamos consultando el estado actualizado del pedido.',
    };
}

export default function CheckoutReturnPage() {
    return (
        <Suspense
            fallback={
                <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
                    <Stack alignItems="center" py={10} spacing={2}>
                        <CircularProgress />
                        <Typography color="text.secondary">Consultando el estado real del pago...</Typography>
                    </Stack>
                </Container>
            }
        >
            <CheckoutReturnPageContent />
        </Suspense>
    );
}

const CONFIRMED_REDIRECT_DELAY_MS = 3000;

function CheckoutReturnPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshState } = useStorefront();
    const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollingAttemptsRef = useRef(0);
    const previousStatusRef = useRef<ReturnStatus>('loading');
    const [orderCode, setOrderCode] = useState<string | null>(null);
    const [order, setOrder] = useState<ActiveOrder | null>(null);
    const [status, setStatus] = useState<ReturnStatus>('loading');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [pollingTimedOut, setPollingTimedOut] = useState(false);
    const [personalization, setPersonalization] = useState<PersonalizationOrderData | null>(null);
    const [personalizationLoading, setPersonalizationLoading] = useState(false);
    const [personalizationError, setPersonalizationError] = useState<string | null>(null);
    const [personalizationLoadedForOrderCode, setPersonalizationLoadedForOrderCode] = useState<string | null>(null);
    const [personalizationUploadingLineId, setPersonalizationUploadingLineId] = useState<string | null>(null);

    const hints = useMemo<ReturnHints>(
        () => ({
            externalReference: searchParams.get('external_reference'),
            paymentId: searchParams.get('payment_id') || searchParams.get('collection_id'),
            result:
                searchParams.get('result') ||
                searchParams.get('collection_status') ||
                searchParams.get('status'),
        }),
        [searchParams],
    );

    const latestPayment = useMemo(() => getLatestPayment(order), [order]);
    const statusCopy = getStatusCopy(status);
    const currencyCode = order?.currencyCode || 'ARS';
    const paymentMetadata = useMemo(
        () => getPublicPaymentMetadata(latestPayment),
        [latestPayment],
    );
    const retryAvailable = canRetryPayment(latestPayment);
    const forceRetryAvailable = canForceRetryPayment(latestPayment, pollingTimedOut);
    const personalizationRequiresAttention = Boolean(
        personalization?.requiresPersonalization &&
            personalization.overallPersonalizationStatus !== 'complete',
    );

    const applyStatus = useCallback(
        (nextStatus: ReturnStatus) => {
            setStatus(nextStatus);

            if (previousStatusRef.current === nextStatus) {
                return;
            }

            previousStatusRef.current = nextStatus;

            if (
                nextStatus === 'confirmed' ||
                nextStatus === 'rejected' ||
                nextStatus === 'cancelled'
            ) {
                void refreshState();
            }
        },
        [refreshState],
    );

    const resolveStatus = useCallback(
        (nextOrder: ActiveOrder | null): ReturnStatus => {
            const payment = getLatestPayment(nextOrder);

            if (isRejectedReturnStatus(hints.result) || isPaymentRejected(payment) || isRejectedProviderStatus(payment)) {
                return 'rejected';
            }

            if (isCancelledReturnStatus(hints.result) || isPaymentCancelled(payment)) {
                return 'cancelled';
            }

            if (isPaymentConfirmed(payment)) {
                return 'confirmed';
            }

            if (payment || (nextOrder && hints.result && !isRejectedReturnStatus(hints.result))) {
                return 'confirmed';
            }

            if (nextOrder) {
                return 'verifying';
            }

            return 'error';
        },
        [hints.result],
    );

    const stopPolling = useCallback(() => {
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
    }, []);

    const loadOrderStatus = useCallback(
        async (code: string, options?: { preserveFeedback?: boolean }) => {
            setRefreshing(true);

            try {
                const response = await fetchShopApi<OrderByCodeResponse>(GET_ORDER_BY_CODE_QUERY, {
                    code,
                });
                const nextOrder = response.orderByCode ?? null;
                const nextStatus = resolveStatus(nextOrder);

                setOrder(nextOrder);
                applyStatus(nextStatus);

                if (!options?.preserveFeedback) {
                    setFeedback(null);
                }

                if (
                    nextStatus === 'confirmed' ||
                    nextStatus === 'rejected' ||
                    nextStatus === 'cancelled'
                ) {
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.removeItem(MERCADOPAGO_ORDER_CODE_STORAGE_KEY);
                    }
                    stopPolling();
                    return false;
                }

                return nextStatus === 'verifying' || nextStatus === 'pending';
            } catch (error) {
                const result = getOperationResultMessage(
                    error,
                    'No pudimos consultar el estado del pedido.',
                );

                applyStatus('error');
                setFeedback({
                    severity: 'error',
                    message:
                        result.message || 'No pudimos consultar el estado del pedido.',
                });
                return false;
            } finally {
                setRefreshing(false);
            }
        },
        [applyStatus, resolveStatus, stopPolling],
    );

    const loadPersonalizationStatus = useCallback(
        async (code: string) => {
            setPersonalizationLoading(true);

            try {
                const data = await fetchPersonalizationOrder(code, {
                    transactionId: hints.paymentId,
                    accessToken: personalization?.accessToken,
                });

                setPersonalization(data);
                setPersonalizationLoadedForOrderCode(code);
                setPersonalizationError(null);
                return data;
            } catch (error) {
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : 'No pudimos consultar si este pedido requiere personalización.';

                setPersonalization(null);
                setPersonalizationLoadedForOrderCode(code);
                setPersonalizationError(message);
                return null;
            } finally {
                setPersonalizationLoading(false);
            }
        },
        [hints.paymentId, personalization?.accessToken],
    );

    const handlePersonalizationUpload = useCallback(
        async (line: PersonalizationLineData, side: 'front' | 'back', file: File, notes: string) => {
            if (!orderCode) {
                return;
            }

            setPersonalizationUploadingLineId(`${line.orderLineId}:${side}`);
            setPersonalizationError(null);

            try {
                const data = await uploadPersonalizationFile({
                    orderCode,
                    orderLineId: line.orderLineId,
                    side,
                    file,
                    notes,
                    transactionId: hints.paymentId,
                    accessToken: personalization?.accessToken,
                });

                setPersonalization(data);
                setPersonalizationLoadedForOrderCode(orderCode);
                setFeedback({
                    severity: 'success',
                    message: 'Archivo recibido. Ya quedó asociado al pedido.',
                });
            } catch (error) {
                const message =
                    error instanceof Error && error.message
                        ? error.message
                        : 'No pudimos subir el archivo de personalización.';

                setPersonalizationError(message);
                setFeedback({
                    severity: 'error',
                    message,
                });
            } finally {
                setPersonalizationUploadingLineId(null);
            }
        },
        [hints.paymentId, orderCode, personalization?.accessToken],
    );

    const handleRetryPayment = useCallback(
        async (force: boolean) => {
            if (!orderCode) {
                return;
            }

            setRetrying(true);
            stopPolling();
            setFeedback(null);

            try {
                const response = await fetchShopApi<RetryMercadoPagoPaymentResponse>(
                    RETRY_MERCADOPAGO_PAYMENT_MUTATION,
                    {
                        orderCode,
                        force,
                    },
                );
                const nextOrder = response.retryMercadoPagoPayment;
                const redirectUrl = getMercadoPagoRedirectUrl(nextOrder);

                setOrder(nextOrder);
                setPollingTimedOut(false);
                pollingAttemptsRef.current = 0;
                applyStatus(resolveStatus(nextOrder));
                await refreshState();

                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem(
                        MERCADOPAGO_ORDER_CODE_STORAGE_KEY,
                        nextOrder.code,
                    );
                }

                if (!redirectUrl) {
                    setFeedback({
                        severity: 'warning',
                        message:
                            'Generamos un nuevo intento, pero no recibimos un enlace de pago válido. Reintentá en unos instantes.',
                    });
                    return;
                }

                window.location.href = redirectUrl;
            } catch (error) {
                const result = getOperationResultMessage(
                    error,
                    'No pudimos generar un nuevo intento de pago con Mercado Pago.',
                );

                setFeedback({
                    severity: 'error',
                    message:
                        result.message ||
                        'No pudimos generar un nuevo intento de pago con Mercado Pago.',
                });
                void loadOrderStatus(orderCode, { preserveFeedback: true });
            } finally {
                setRetrying(false);
            }
        },
        [applyStatus, loadOrderStatus, orderCode, refreshState, resolveStatus, stopPolling],
    );

    useEffect(() => {
        const hintedOrderCode = hints.externalReference?.trim() || null;

        if (typeof window === 'undefined') {
            setOrderCode(hintedOrderCode);
            return;
        }

        if (hintedOrderCode) {
            window.sessionStorage.setItem(MERCADOPAGO_ORDER_CODE_STORAGE_KEY, hintedOrderCode);
            setOrderCode(hintedOrderCode);
            return;
        }

        const storedOrderCode = window.sessionStorage.getItem(MERCADOPAGO_ORDER_CODE_STORAGE_KEY);
        setOrderCode(storedOrderCode || null);
    }, [hints.externalReference]);

    useEffect(() => {
        setPollingTimedOut(false);
        pollingAttemptsRef.current = 0;
        previousStatusRef.current = 'loading';
    }, [orderCode]);

    useEffect(() => {
        stopPolling();
        pollingAttemptsRef.current = 0;

        if (!orderCode) {
            applyStatus('missing');
            setOrder(null);
            return;
        }

        let cancelled = false;

        const poll = async () => {
            const shouldContinuePolling = await loadOrderStatus(orderCode);

            if (cancelled) {
                return;
            }

            if (shouldContinuePolling && pollingAttemptsRef.current < MAX_POLL_ATTEMPTS) {
                pollingAttemptsRef.current += 1;
                pollingTimeoutRef.current = setTimeout(() => {
                    void poll();
                }, POLL_INTERVAL_MS);
                return;
            }

            if (shouldContinuePolling) {
                setPollingTimedOut(true);
                setFeedback({
                    severity: 'warning',
                    message:
                        'Seguimos esperando la confirmación final. Si el link quedó inválido o venció, podés generar un nuevo intento de pago.',
                });
            }
        };

        void poll();

        return () => {
            cancelled = true;
            stopPolling();
        };
    }, [applyStatus, loadOrderStatus, orderCode, stopPolling]);

    useEffect(() => {
        if (status !== 'confirmed' || !orderCode) {
            setPersonalization(null);
            setPersonalizationError(null);
            setPersonalizationLoadedForOrderCode(null);
            return;
        }

        if (
            personalizationLoadedForOrderCode === orderCode &&
            (personalization?.orderCode === orderCode || personalizationError)
        ) {
            return;
        }

        void loadPersonalizationStatus(orderCode);
    }, [
        loadPersonalizationStatus,
        orderCode,
        personalization?.orderCode,
        personalizationError,
        personalizationLoadedForOrderCode,
        status,
    ]);

    useEffect(() => {
        if (status !== 'confirmed' || !orderCode) {
            return;
        }

        if (
            personalizationLoading ||
            personalizationError ||
            personalizationLoadedForOrderCode !== orderCode ||
            personalizationRequiresAttention
        ) {
            return;
        }

        const timer = setTimeout(() => {
            router.push(`/mi-cuenta/pedidos/${orderCode}`);
        }, CONFIRMED_REDIRECT_DELAY_MS);

        return () => clearTimeout(timer);
    }, [
        orderCode,
        personalizationError,
        personalizationLoadedForOrderCode,
        personalizationLoading,
        personalizationRequiresAttention,
        router,
        status,
    ]);

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Stack spacing={3}>
                <Stack spacing={1}>
                    <Typography variant="h3" fontWeight={700}>
                        Retorno de pago
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Estamos confirmando el estado de tu pago y del pedido.
                    </Typography>
                </Stack>

                <Alert severity={statusCopy.severity}>
                    <strong>{statusCopy.title}.</strong> {statusCopy.description}
                </Alert>

                {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
                    <Paper variant="outlined" sx={{ flex: 1, p: { xs: 3, md: 4 }, borderRadius: 3 }}>
                        <Stack spacing={2.5}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                            >
                                <Typography variant="h5" fontWeight={700}>
                                    Estado consultado
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {orderCode && <Chip label={`Pedido ${orderCode}`} variant="outlined" />}
                                    {latestPayment && <Chip label={`Pago ${latestPayment.state}`} variant="outlined" />}
                                    {order && <Chip label={`Orden ${order.state}`} variant="outlined" />}
                                </Stack>
                            </Stack>

                            {(refreshing || retrying) && (
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <CircularProgress size={18} />
                                    <Typography color="text.secondary">
                                        {retrying
                                            ? 'Generando un nuevo intento de pago...'
                                            : 'Consultando estado actualizado...'}
                                    </Typography>
                                </Stack>
                            )}

                            {!orderCode && (
                                <Alert severity="warning">
                                    No pudimos identificar el pedido. Volvé al checkout para retomar la compra.
                                </Alert>
                            )}

                            {order && (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 3,
                                        bgcolor: 'grey.50',
                                    }}
                                >
                                    <Stack spacing={1.25}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Subtotal</Typography>
                                            <Typography fontWeight={600}>
                                                {formatCurrency(order.subTotalWithTax, currencyCode)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Envío</Typography>
                                            <Typography fontWeight={600}>
                                                {formatCurrency(order.shippingWithTax, currencyCode)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Total</Typography>
                                            <Typography variant="h6" fontWeight={700}>
                                                {formatCurrency(order.totalWithTax, currencyCode)}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            )}

                            {status === 'confirmed' && orderCode && (
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

                            {latestPayment && (
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Último pago registrado
                                    </Typography>
                                    <Typography>
                                        Método: <strong>{latestPayment.method}</strong>
                                    </Typography>
                                    <Typography>
                                        Estado real: <strong>{latestPayment.state}</strong>
                                    </Typography>
                                    {paymentMetadata?.environment && (
                                        <Typography color="text.secondary">
                                            Ambiente: {paymentMetadata.environment}
                                        </Typography>
                                    )}
                                    {latestPayment.errorMessage && (
                                        <Typography color="error.main">
                                            Detalle: {latestPayment.errorMessage}
                                        </Typography>
                                    )}
                                    {paymentMetadata?.status && (
                                        <Typography color="text.secondary">
                                            Mercado Pago reportó: {paymentMetadata.status}
                                            {paymentMetadata.statusDetail
                                                ? ` (${paymentMetadata.statusDetail})`
                                                : ''}
                                        </Typography>
                                    )}
                                    {paymentMetadata?.lastDecision && (
                                        <Typography color="text.secondary">
                                            Última validación: {paymentMetadata.lastDecision}
                                        </Typography>
                                    )}
                                </Stack>
                            )}

                            {!latestPayment && order && (
                                <Alert severity="info">
                                    La orden existe, pero todavía no vemos un pago terminal. Si recién volviste desde Mercado Pago, puede seguir en verificación unos instantes.
                                </Alert>
                            )}
                        </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 380, p: 3, borderRadius: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h5" fontWeight={700}>
                                Acciones
                            </Typography>
                            <Divider />

                            {forceRetryAvailable && (
                                <Alert severity="warning">
                                    El pago sigue en verificación. Si el enlace anterior venció o quedó inválido, podés generar un nuevo intento.
                                </Alert>
                            )}

                            <Divider />

                            {(status === 'rejected' || status === 'cancelled') ? (
                                <Button component={Link} href="/checkout" variant="contained" color="error">
                                    Volver a elegir pago
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        if (retryAvailable) {
                                            void handleRetryPayment(false);
                                            return;
                                        }

                                        if (forceRetryAvailable) {
                                            void handleRetryPayment(true);
                                        }
                                    }}
                                    disabled={(!retryAvailable && !forceRetryAvailable) || retrying || refreshing}
                                >
                                    {retryAvailable || forceRetryAvailable
                                        ? 'Generar nuevo intento'
                                        : 'Sin reintento disponible'}
                                </Button>
                            )}

                            {orderCode && status === 'confirmed' && (
                                <Button
                                    component={Link}
                                    href={`/mi-cuenta/pedidos/${orderCode}`}
                                    variant="contained"
                                    color="success"
                                >
                                    Ver mi pedido
                                </Button>
                            )}

                            <Button
                                variant="outlined"
                                onClick={() => {
                                    if (orderCode) {
                                        stopPolling();
                                        pollingAttemptsRef.current = 0;
                                        setPollingTimedOut(false);
                                        void loadOrderStatus(orderCode, { preserveFeedback: true });
                                    }
                                }}
                                disabled={!orderCode || refreshing || retrying}
                            >
                                Reconsultar estado
                            </Button>

                            <Button component={Link} href="/checkout" variant="text">
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
