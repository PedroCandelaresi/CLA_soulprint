'use client';

import { useState, useCallback } from 'react';
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
import { createGetnetCheckout, getnetStorage } from '@/lib/getnet';
import type { CreateCheckoutResponse } from '@/types/getnet';

interface GetnetCheckoutButtonProps {
    cart: Cart;
    onCheckoutComplete?: () => void;
    onBeforeCheckout?: () => Promise<void>;
    disabled?: boolean;
    variant?: 'contained' | 'outlined';
}

export function GetnetCheckoutButton({
    cart,
    onCheckoutComplete,
    onBeforeCheckout,
    disabled = false,
    variant = 'contained',
}: GetnetCheckoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [checkoutData, setCheckoutData] = useState<{
        transactionId: string;
        orderUuid: string;
        vendureOrderCode: string;
    } | null>(null);

    const handleCheckout = useCallback(async () => {
        // Prevent double-click
        if (isLoading || disabled) return;

        setIsLoading(true);
        setError(null);

        try {
            await onBeforeCheckout?.();

            // Map cart items to the format expected by the backend
            const items = cart.lines.map((line) => ({
                id: line.productVariant.id,
                name: `${line.productVariant.product.name} - ${line.productVariant.name}`,
                quantity: line.quantity,
                unitPrice: line.unitPriceWithTax, // in cents
            }));

            // Get site URL
            const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

            // Create checkout request
            const response = await createGetnetCheckout({
                orderCode: cart.code,
                items,
                shippingCost: cart.shippingWithTax > 0 ? cart.shippingWithTax : undefined,
                successUrl: `${siteUrl}/checkout/success`,
                failedUrl: `${siteUrl}/checkout/failed`,
            });

            if (!response.success || !response.data) {
                setError(response.error || 'No se pudo iniciar el proceso de pago');
                return;
            }

            // Store checkout data for dialog
            setCheckoutData({
                transactionId: response.data.transactionId,
                orderUuid: response.data.orderUuid,
                vendureOrderCode: response.data.vendureOrderCode,
            });
            setCheckoutUrl(response.data.processUrl || response.data.checkoutUrl);
            setShowDialog(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar el pago');
        } finally {
            setIsLoading(false);
        }
    }, [cart, isLoading, disabled, onBeforeCheckout]);

    function handleRedirectToPayment() {
        if (checkoutUrl && checkoutData) {
            // Ensure data is saved in sessionStorage (should already be saved by client)
            getnetStorage.saveTransaction({
                transactionId: checkoutData.transactionId,
                orderUuid: checkoutData.orderUuid,
                vendureOrderCode: checkoutData.vendureOrderCode,
                cartCode: cart.code,
            });

            // Redirect to Getnet checkout
            window.location.href = checkoutUrl;
        }
    }

    function handleCloseDialog() {
        setShowDialog(false);
        setCheckoutUrl(null);
        setCheckoutData(null);
        if (error) {
            setError(null);
        }
    }

    const isDisabled = disabled || isLoading || cart.lines.length === 0;

    return (
        <>
            <Box>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Button
                    variant={variant}
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={isDisabled}
                    onClick={handleCheckout}
                    startIcon={
                        isLoading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            <LocalShippingIcon />
                        )
                    }
                    sx={{
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                    }}
                >
                    {isLoading ? 'Iniciando pago...' : 'Pagar con Getnet'}
                </Button>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block', textAlign: 'center' }}
                >
                    Pago seguro procesado por Santander / Getnet
                </Typography>
            </Box>

            {/* Checkout Confirmation Dialog */}
            <Dialog
                open={showDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                aria-labelledby="checkout-dialog-title"
            >
                <DialogTitle id="checkout-dialog-title">
                    Redirigiendo al pago...
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={48} />

                        {checkoutData && (
                            <Box
                                sx={{
                                    width: '100%',
                                    p: 2,
                                    bgcolor: 'grey.100',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Transaction: {checkoutData.transactionId.slice(0, 8)}...
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Orden: {checkoutData.vendureOrderCode || checkoutData.orderUuid.slice(0, 8)}...
                                </Typography>
                            </Box>
                        )}

                        <Typography
                            variant="body2"
                            textAlign="center"
                            color="text.secondary"
                        >
                            Serás redirigido a la página de pago segura de Santander.
                            <br />
                            Una vez completado el pago, serás redirigido de vuelta aquí.
                        </Typography>

                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            <Button variant="outlined" onClick={handleCloseDialog}>
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
