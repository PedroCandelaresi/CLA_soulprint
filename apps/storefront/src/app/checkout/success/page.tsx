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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';

interface TransactionStatus {
    id: string;
    vendureOrderCode: string;
    providerOrderUuid: string;
    status: string;
    amount: number;
    currency: string;
    webhookEventCount: number;
    isTerminal: boolean;
    approvedAt?: string;
    createdAt: string;
}

interface ApiResponse {
    success: boolean;
    data?: TransactionStatus;
    error?: string;
}

function formatMoney(amount: number, currency: string): string {
    // Amount is in cents, currency is like "032" for ARS
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency === '032' ? 'ARS' : currency,
    }).format(amount / 100);
}

export default function CheckoutSuccessPage() {
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
                                amount: 0,
                                currency: '032',
                                webhookEventCount: data.data.webhookEventCount || 0,
                                isTerminal: data.data.isTerminal || false,
                                approvedAt: data.data.approvedAt,
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

    function handleNewOrder() {
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

    return (
        <Box maxWidth={600} mx="auto" py={6}>
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
                <Stack spacing={4} alignItems="center" textAlign="center">
                    {/* Success Icon */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: 'success.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main' }} />
                    </Box>

                    {/* Title */}
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom>
                            ¡Pago exitoso!
                        </Typography>
                        <Typography color="text.secondary">
                            Tu pedido ha sido procesado correctamente.
                        </Typography>
                    </Box>

                    {/* Transaction Details */}
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
                                                color: transaction.status === 'approved' ? 'success.main' : 'warning.main',
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {transaction.status}
                                        </Typography>
                                    </Stack>
                                    
                                    {transaction.amount > 0 && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Monto</Typography>
                                            <Typography fontWeight={600}>
                                                {formatMoney(transaction.amount, transaction.currency)}
                                            </Typography>
                                        </Stack>
                                    )}
                                    
                                    {transaction.approvedAt && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Aprobado</Typography>
                                            <Typography>
                                                {new Date(transaction.approvedAt).toLocaleString('es-AR')}
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
                            <Typography color="warning.main" textAlign="center">
                                {error}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                                Si realizaste un pago, el mismo será procesado en breve.
                                Puedes verificar el estado de tu orden desde tu cuenta.
                            </Typography>
                        </Box>
                    )}

                    {/* Actions */}
                    <Stack spacing={2} width="100%" sx={{ mt: 2 }}>
                        <Button
                            component={Link}
                            href="/carrito"
                            variant="contained"
                            size="large"
                            startIcon={<ShoppingBagIcon />}
                            onClick={handleNewOrder}
                        >
                            Volver al carrito
                        </Button>
                        
                        <Button
                            component={Link}
                            href="/productos"
                            variant="outlined"
                            onClick={handleNewOrder}
                        >
                            Continuar comprando
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
