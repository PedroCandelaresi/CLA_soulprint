'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Paper,
    Stack,
    Typography,
    Alert,
    Chip,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import {
    fetchTransactionWithFallback,
    getnetStorage,
    STATUS_DISPLAY_MAP,
} from '@/lib/getnet';
import type { TransactionStatus, TransactionStatusValue } from '@/types/getnet';

function formatDate(dateString: string): string {
    try {
        return new Date(dateString).toLocaleString('es-AR', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return dateString;
    }
}

function getStatusColor(status: TransactionStatusValue): 'success' | 'warning' | 'error' | 'info' {
    const config = STATUS_DISPLAY_MAP[status];
    return config?.color || 'info';
}

export default function CheckoutFailedPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const checkOrderStatus = useCallback(async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) setRefreshing(true);

        const result = await fetchTransactionWithFallback();

        if (result.status) {
            setTransaction(result.status);
            setError(null);
        } else if (result.error) {
            setError(result.error);
            if (!transaction) {
                setTransaction(null);
            }
        }

        setIsLoading(false);
        if (showRefreshIndicator) setRefreshing(false);
    }, [transaction]);

    useEffect(() => {
        void checkOrderStatus();
    }, []);

    async function handleRefresh() {
        await checkOrderStatus(true);
    }

    // Determine the actual status to display
    const displayStatus = transaction?.status || 'unknown';
    const statusConfig =
        STATUS_DISPLAY_MAP[displayStatus as TransactionStatusValue] ||
        STATUS_DISPLAY_MAP.unknown;

    // Determine failure reason
    const getFailureMessage = () => {
        switch (displayStatus) {
            case 'rejected':
                return 'Tu pago fue rechazado por el banco o procesador de pagos.';
            case 'cancelled':
                return 'El pago fue cancelado.';
            case 'expired':
                return 'El enlace de pago ha expirado.';
            case 'pending':
            case 'processing':
                return 'El pago está siendo procesado. Te notificaremos cuando se confirme.';
            default:
                return statusConfig.message;
        }
    };

    const statusColor = getStatusColor(displayStatus as TransactionStatusValue);

    if (isLoading) {
        return (
            <Box minHeight="50vh" display="grid" sx={{ placeItems: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress />
                    <Typography>Verificando estado del pago...</Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box maxWidth={600} mx="auto" py={6}>
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
                <Stack spacing={4} alignItems="center" textAlign="center">
                    {/* Error Icon */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: `${statusColor}.light`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ErrorOutlineIcon
                            sx={{ fontSize: 48, color: `${statusColor}.main` }}
                        />
                    </Box>

                    {/* Title */}
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom>
                            {statusConfig.title}
                        </Typography>
                        <Typography color="text.secondary">
                            {getFailureMessage()}
                        </Typography>
                    </Box>

                    {/* Status Chip */}
                    <Chip
                        label={displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        color={statusColor}
                        size="medium"
                    />

                    {/* Transaction Details */}
                    {transaction && (
                        <Card variant="outlined" sx={{ width: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    {transaction.vendureOrderCode && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Orden</Typography>
                                            <Typography fontWeight={600}>
                                                {transaction.vendureOrderCode}
                                            </Typography>
                                        </Stack>
                                    )}

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Transaction ID</Typography>
                                        <Typography fontWeight={600}>
                                            {transaction.transactionId.slice(0, 12)}...
                                        </Typography>
                                    </Stack>

                                    {transaction.createdAt && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Fecha</Typography>
                                            <Typography>
                                                {formatDate(transaction.createdAt)}
                                            </Typography>
                                        </Stack>
                                    )}

                                    {transaction.lastEvent && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">
                                                Último evento
                                            </Typography>
                                            <Typography sx={{ textTransform: 'capitalize' }}>
                                                {transaction.lastEvent}
                                            </Typography>
                                        </Stack>
                                    )}

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">
                                            Eventos webhook
                                        </Typography>
                                        <Typography>{transaction.webhookEventCount}</Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error message if no transaction found */}
                    {error && !transaction && (
                        <Alert
                            severity="error"
                            sx={{ width: '100%' }}
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    startIcon={
                                        refreshing ? (
                                            <CircularProgress size={16} color="inherit" />
                                        ) : (
                                            <RefreshIcon />
                                        )
                                    }
                                >
                                    {refreshing ? 'Verificando...' : 'Reintentar'}
                                </Button>
                            }
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Common reasons */}
                    {displayStatus === 'rejected' || !transaction ? (
                        <Box sx={{ width: '100%', textAlign: 'left' }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Posibles razones:
                            </Typography>
                            <Stack spacing={1}>
                                <Typography variant="body2" color="text.secondary">
                                    • La tarjeta fue rechazada por el banco
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Fondos insuficientes en la cuenta
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Datos de tarjeta incorrectos
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    • Sesión de pago expirada
                                </Typography>
                            </Stack>
                        </Box>
                    ) : null}

                    {/* Actions */}
                    <Stack spacing={2} width="100%" sx={{ mt: 2 }}>
                        <Button
                            component={Link}
                            href="/carrito"
                            prefetch={false}
                            variant="contained"
                            size="large"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                        >
                            Intentar de nuevo
                        </Button>

                        <Button
                            component={Link}
                            href="/productos"
                            variant="outlined"
                            startIcon={<ShoppingBagIcon />}
                            onClick={() => getnetStorage.clearTransaction()}
                        >
                            Continuar comprando
                        </Button>

                        <Button
                            startIcon={
                                refreshing ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <RefreshIcon />
                                )
                            }
                            onClick={handleRefresh}
                            disabled={refreshing}
                            size="small"
                        >
                            {refreshing ? 'Actualizando...' : 'Actualizar estado'}
                        </Button>
                    </Stack>

                    {/* Footer note */}
                    <Typography variant="caption" color="text.secondary">
                        Si el problema persiste, contacta a soporte con el número de tu orden.
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
