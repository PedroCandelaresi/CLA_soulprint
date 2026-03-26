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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    fetchTransactionWithFallback,
    getnetStorage,
    STATUS_DISPLAY_MAP,
} from '@/lib/getnet';
import type { TransactionStatus, TransactionStatusValue } from '@/types/getnet';

function formatMoney(amount: number, currency: string): string {
    // Amount is in cents, currency is like "032" for ARS
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency === '032' ? 'ARS' : currency,
    }).format(amount / 100);
}

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

export default function CheckoutSuccessPage() {
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
            // Keep existing transaction if we have one
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

    function handleClearAndNavigate(href: string) {
        getnetStorage.clearTransaction();
        window.location.href = href;
    }

    const statusConfig = transaction?.status
        ? STATUS_DISPLAY_MAP[transaction.status as TransactionStatusValue] ||
          STATUS_DISPLAY_MAP.unknown
        : STATUS_DISPLAY_MAP.unknown;

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

    // Determine the actual status to display
    const displayStatus = transaction?.status || 'unknown';
    const statusColor = getStatusColor(displayStatus as TransactionStatusValue);

    return (
        <Box maxWidth={600} mx="auto" py={6}>
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
                <Stack spacing={4} alignItems="center" textAlign="center">
                    {/* Status Icon */}
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
                        <CheckCircleOutlineIcon
                            sx={{ fontSize: 48, color: `${statusColor}.main` }}
                        />
                    </Box>

                    {/* Title */}
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom>
                            {statusConfig.title}
                        </Typography>
                        <Typography color="text.secondary">
                            {statusConfig.message}
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

                                    {transaction.amount && transaction.amount > 0 && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Monto</Typography>
                                            <Typography fontWeight={600}>
                                                {formatMoney(
                                                    transaction.amount,
                                                    transaction.currency || '032'
                                                )}
                                            </Typography>
                                        </Stack>
                                    )}

                                    {transaction.createdAt && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Fecha</Typography>
                                            <Typography>
                                                {formatDate(transaction.createdAt)}
                                            </Typography>
                                        </Stack>
                                    )}

                                    {transaction.approvedAt && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Aprobado</Typography>
                                            <Typography>
                                                {formatDate(transaction.approvedAt)}
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

                    {/* Error message */}
                    {error && !transaction && (
                        <Alert
                            severity="warning"
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

                    {error && transaction && (
                        <Alert severity="info" sx={{ width: '100%' }}>
                            Hubo un problema al verificar el estado actualizado, pero tu pago
                            está siendo procesado.
                        </Alert>
                    )}

                    {/* Actions */}
                    <Stack spacing={2} width="100%" sx={{ mt: 2 }}>
                        <Button
                            component={Link}
                            href="/carrito"
                            variant="contained"
                            size="large"
                            startIcon={<ShoppingBagIcon />}
                            onClick={() => getnetStorage.clearTransaction()}
                        >
                            Volver al carrito
                        </Button>

                        <Button
                            component={Link}
                            href="/productos"
                            variant="outlined"
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
                        Recibirás un email de confirmación cuando tu pedido sea procesado.
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
