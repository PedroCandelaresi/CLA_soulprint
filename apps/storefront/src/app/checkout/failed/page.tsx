'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';

interface TransactionStatus {
    id: string;
    vendureOrderCode: string;
    providerOrderUuid: string;
    status: string;
    lastEvent?: string;
    webhookEventCount: number;
    isTerminal: boolean;
    createdAt: string;
}

interface ApiResponse {
    success: boolean;
    data?: TransactionStatus;
    error?: string;
}

export default function CheckoutFailedPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkOrderStatus() {
            // Get transaction ID from sessionStorage
            const transactionId = sessionStorage.getItem('getnet_transaction_id');
            const orderUuid = sessionStorage.getItem('getnet_order_uuid');
            const cartCode = sessionStorage.getItem('getnet_cart_code');

            if (!transactionId) {
                // Try to get status by order UUID if no transaction ID
                if (orderUuid) {
                    try {
                        const response = await fetch(`/api/payments/getnet/order/${encodeURIComponent(orderUuid)}`);
                        const data = await response.json();
                        
                        if (data.success && data.data) {
                            setTransaction({
                                id: data.data.transactionId || '',
                                vendureOrderCode: data.data.vendureOrderCode || cartCode || '',
                                providerOrderUuid: data.data.orderUuid || orderUuid,
                                status: data.data.status || 'unknown',
                                lastEvent: data.data.providerStatus,
                                webhookEventCount: data.data.webhookEventCount || 0,
                                isTerminal: data.data.isTerminal || false,
                                createdAt: data.data.createdAt || '',
                            });
                        }
                    } catch (err) {
                        console.error('Error fetching order status:', err);
                    }
                }
                
                setError('No se encontró información de la transacción.');
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/payments/getnet/transaction/${encodeURIComponent(transactionId)}`);
                const data: ApiResponse = await response.json();

                if (!response.ok || !data.success || !data.data) {
                    setError(data.error || 'No se pudo obtener el estado de la transacción');
                    return;
                }

                setTransaction(data.data);
            } catch (err) {
                setError('Error al consultar el estado del pago');
                console.error('Error checking order status:', err);
            } finally {
                setIsLoading(false);
            }
        }

        void checkOrderStatus();
    }, []);

    function handleTryAgain() {
        // Clear session storage
        sessionStorage.removeItem('getnet_transaction_id');
        sessionStorage.removeItem('getnet_order_uuid');
        sessionStorage.removeItem('getnet_cart_code');
    }

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

    // Determine the failure reason based on status
    const getFailureMessage = () => {
        if (!transaction) {
            return 'El pago no pudo ser procesado.';
        }

        switch (transaction.status) {
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
                return 'Hubo un problema con el procesamiento de tu pago.';
        }
    };

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
                            bgcolor: 'error.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
                    </Box>

                    {/* Title */}
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom>
                            Pago no realizado
                        </Typography>
                        <Typography color="text.secondary">
                            {getFailureMessage()}
                        </Typography>
                    </Box>

                    {/* Transaction Details (if available) */}
                    {transaction && (
                        <Card variant="outlined" sx={{ width: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    {transaction.vendureOrderCode && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Orden</Typography>
                                            <Typography fontWeight={600}>{transaction.vendureOrderCode}</Typography>
                                        </Stack>
                                    )}
                                    
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Transaction ID</Typography>
                                        <Typography fontWeight={600}>
                                            {transaction.id.slice(0, 8)}...
                                        </Typography>
                                    </Stack>
                                    
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Estado</Typography>
                                        <Typography 
                                            fontWeight={600}
                                            sx={{ 
                                                color: 'error.main',
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {transaction.status}
                                        </Typography>
                                    </Stack>
                                    
                                    {transaction.lastEvent && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Último evento</Typography>
                                            <Typography sx={{ textTransform: 'capitalize' }}>
                                                {transaction.lastEvent}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error message if status couldn't be verified */}
                    {error && !transaction && (
                        <Box sx={{ width: '100%' }}>
                            <Typography color="text.secondary" textAlign="center">
                                {error}
                            </Typography>
                        </Box>
                    )}

                    {/* Common reasons */}
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

                    {/* Actions */}
                    <Stack spacing={2} width="100%" sx={{ mt: 2 }}>
                        <Button
                            component={Link}
                            href="/carrito"
                            variant="contained"
                            size="large"
                            startIcon={<RefreshIcon />}
                            onClick={handleTryAgain}
                        >
                            Intentar de nuevo
                        </Button>
                        
                        <Button
                            component={Link}
                            href="/productos"
                            variant="outlined"
                            startIcon={<ShoppingBagIcon />}
                            onClick={handleTryAgain}
                        >
                            Continuar comprando
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
