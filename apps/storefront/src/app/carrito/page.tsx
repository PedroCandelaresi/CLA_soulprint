'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useStorefront } from '@/components/providers/StorefrontProvider';

type FeedbackState = {
    severity: 'success' | 'error';
    message: string;
};

function formatCurrency(amount: number, currencyCode: string) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
    }).format(amount / 100);
}

export default function CarritoPage() {
    const { activeOrder, adjustOrderLine, cartLoading, customer, initialized, removeOrderLine } = useStorefront();
    const [pendingLineId, setPendingLineId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    const lines = activeOrder?.lines ?? [];
    const currencyCode = activeOrder?.currencyCode || 'ARS';
    const summaryText = useMemo(() => {
        if (!customer) {
            return 'Podés seguir comprando como invitado o ingresar para conservar tu carrito entre dispositivos.';
        }

        return `Carrito asociado a ${customer.emailAddress}.`;
    }, [customer]);

    const handleChangeQuantity = async (orderLineId: string, nextQuantity: number) => {
        setPendingLineId(orderLineId);
        setFeedback(null);

        const result =
            nextQuantity <= 0
                ? await removeOrderLine(orderLineId)
                : await adjustOrderLine(orderLineId, nextQuantity);

        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Carrito actualizado correctamente.' : 'No se pudo actualizar el carrito.'),
        });
        setPendingLineId(null);
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Stack spacing={3}>
                <Stack spacing={1}>
                    <Typography variant="h3" fontWeight={700}>
                        Carrito
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {summaryText}
                    </Typography>
                </Stack>

                {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                {!initialized ? (
                    <Stack alignItems="center" py={8}>
                        <CircularProgress />
                    </Stack>
                ) : lines.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
                        <Stack spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                            <Typography variant="h5" fontWeight={700}>
                                Tu carrito está vacío
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Agregá productos desde el catálogo para empezar tu pedido.
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Button component={Link} href="/productos" variant="contained">
                                    Ir al catálogo
                                </Button>
                                {!customer && (
                                    <Button component={Link} href="/auth/login" variant="outlined">
                                        Ingresar o crear cuenta
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </Paper>
                ) : (
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
                        <Stack spacing={2} flex={1} width="100%">
                            {lines.map((line) => {
                                const isPending = cartLoading && pendingLineId === line.id;
                                const image = line.featuredAsset?.preview || '/images/backgrounds/errorimg.svg';

                                return (
                                    <Paper key={line.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={2}
                                            alignItems={{ xs: 'stretch', sm: 'center' }}
                                        >
                                            <Box
                                                sx={{
                                                    width: { xs: '100%', sm: 120 },
                                                    aspectRatio: '1 / 1',
                                                    position: 'relative',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    bgcolor: 'grey.100',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Image
                                                    src={image}
                                                    alt={line.productVariant.name}
                                                    fill
                                                    style={{ objectFit: 'contain', padding: '12px' }}
                                                />
                                            </Box>

                                            <Stack spacing={1} flex={1}>
                                                <Typography variant="h6" fontWeight={700}>
                                                    {line.productVariant.name}
                                                </Typography>
                                                {line.productVariant.sku && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        SKU: {line.productVariant.sku}
                                                    </Typography>
                                                )}
                                                <Typography variant="body2" color="text.secondary">
                                                    Unitario: {formatCurrency(line.unitPriceWithTax, currencyCode)}
                                                </Typography>
                                            </Stack>

                                            <Stack
                                                direction={{ xs: 'row', sm: 'column' }}
                                                spacing={1.5}
                                                alignItems={{ xs: 'center', sm: 'flex-end' }}
                                                justifyContent="space-between"
                                            >
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <IconButton
                                                        aria-label="Disminuir cantidad"
                                                        onClick={() => void handleChangeQuantity(line.id, line.quantity - 1)}
                                                        disabled={isPending}
                                                    >
                                                        <RemoveRoundedIcon />
                                                    </IconButton>
                                                    <Typography minWidth={24} textAlign="center" fontWeight={700}>
                                                        {line.quantity}
                                                    </Typography>
                                                    <IconButton
                                                        aria-label="Aumentar cantidad"
                                                        onClick={() => void handleChangeQuantity(line.id, line.quantity + 1)}
                                                        disabled={isPending}
                                                    >
                                                        <AddRoundedIcon />
                                                    </IconButton>
                                                </Stack>

                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="h6" fontWeight={700}>
                                                        {formatCurrency(line.linePriceWithTax, currencyCode)}
                                                    </Typography>
                                                    <IconButton
                                                        aria-label="Eliminar producto"
                                                        onClick={() => void handleChangeQuantity(line.id, 0)}
                                                        disabled={isPending}
                                                    >
                                                        <DeleteOutlineRoundedIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                );
                            })}
                        </Stack>

                        <Paper variant="outlined" sx={{ width: '100%', maxWidth: 360, p: 3, borderRadius: 3 }}>
                            <Stack spacing={2}>
                                <Typography variant="h5" fontWeight={700}>
                                    Resumen
                                </Typography>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography color="text.secondary">Productos</Typography>
                                    <Typography fontWeight={600}>{activeOrder?.totalQuantity ?? 0}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography color="text.secondary">Subtotal</Typography>
                                    <Typography fontWeight={600}>
                                        {formatCurrency(activeOrder?.subTotalWithTax ?? 0, currencyCode)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography color="text.secondary">Total</Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                        {formatCurrency(activeOrder?.totalWithTax ?? 0, currencyCode)}
                                    </Typography>
                                </Stack>
                                <Alert severity="info">
                                    El checkout demo ya permite completar el pedido con envío y pago simulados.
                                </Alert>
                                <Button component={Link} href="/checkout" variant="contained" fullWidth>
                                    Finalizar compra
                                </Button>
                                <Button component={Link} href="/productos" variant="outlined" fullWidth>
                                    Seguir comprando
                                </Button>
                            </Stack>
                        </Paper>
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
