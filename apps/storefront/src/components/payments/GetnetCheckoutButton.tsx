'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    Alert,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type { Cart } from '@/types/cart';

interface GetnetCheckoutButtonProps {
    cart: Cart;
    onCheckoutComplete?: () => void;
}

interface CheckoutResponse {
    success: boolean;
    data?: {
        transactionId: string;
        orderUuid: string;
        checkoutUrl: string;
        vendureOrderCode: string;
        expiresAt?: string;
    };
    error?: string;
}

export function GetnetCheckoutButton({ cart, onCheckoutComplete }: GetnetCheckoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const [orderUuid, setOrderUuid] = useState<string | null>(null);

    async function handleCheckout() {
        setIsLoading(true);
        setError(null);
        
        try {
            // Map cart items to the format expected by the backend
            const items = cart.lines.map((line) => ({
                id: line.productVariant.id,
                name: `${line.productVariant.product.name} - ${line.productVariant.name}`,
                quantity: line.quantity,
                unitPrice: line.unitPriceWithTax, // in cents
            }));
            
            // Add shipping if applicable
            const shippingCost = cart.shippingWithTax > 0 ? cart.shippingWithTax : undefined;
            
            const response = await fetch('/api/payments/getnet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderCode: cart.code,
                    items,
                    shippingCost,
                    successUrl: `${window.location.origin}/checkout/success`,
                    failedUrl: `${window.location.origin}/checkout/failed`,
                }),
            });
            
            const data: CheckoutResponse = await response.json();
            
            if (!response.ok || !data.success || !data.data) {
                setError(data.error || 'No se pudo iniciar el proceso de pago');
                return;
            }
            
            // Store IDs for later retrieval
            setTransactionId(data.data.transactionId);
            setOrderUuid(data.data.orderUuid);
            setCheckoutUrl(data.data.checkoutUrl);
            setShowDialog(true);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar el pago');
        } finally {
            setIsLoading(false);
        }
    }

    function handleRedirectToPayment() {
        if (checkoutUrl) {
            // Store IDs in sessionStorage for later retrieval on success/failed pages
            if (transactionId) {
                sessionStorage.setItem('getnet_transaction_id', transactionId);
            }
            if (orderUuid) {
                sessionStorage.setItem('getnet_order_uuid', orderUuid);
            }
            if (cart.code) {
                sessionStorage.setItem('getnet_cart_code', cart.code);
            }
            
            // Redirect to Getnet checkout
            window.location.href = checkoutUrl;
        }
    }

    function handleCloseDialog() {
        setShowDialog(false);
        setCheckoutUrl(null);
        setTransactionId(null);
        setOrderUuid(null);
        if (error) {
            setError(null);
        }
    }

    return (
        <>
            <Box>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={isLoading || cart.lines.length === 0}
                    onClick={handleCheckout}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LocalShippingIcon />}
                    sx={{
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                    }}
                >
                    {isLoading ? 'Iniciando pago...' : 'Pagar con Getnet'}
                </Button>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Pago seguro procesado por Santander / Getnet
                </Typography>
            </Box>

            {/* Checkout Dialog */}
            <Dialog
                open={showDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Redirigiendo al pago...
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={48} />
                        
                        {transactionId && orderUuid && (
                            <Typography variant="body2" color="text.secondary">
                                Transaction: {transactionId.slice(0, 8)}... / Order: {orderUuid.slice(0, 8)}...
                            </Typography>
                        )}
                        
                        <Typography variant="body2" textAlign="center" color="text.secondary">
                            Serás redirigido a la página de pago segura de Santander.
                            <br />
                            Una vez completado el pago, serás redirigido de vuelta aquí.
                        </Typography>
                        
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={handleCloseDialog}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleRedirectToPayment}
                                autoFocus
                            >
                                Ir al pago
                            </Button>
                        </Stack>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
}
