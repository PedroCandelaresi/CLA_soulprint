'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import TooltipButton from '@/components/ui/TooltipButton';
import TooltipIconButton from '@/components/ui/TooltipIconButton';

type FeedbackState = {
    severity: 'success' | 'error';
    message: string;
};

const CHECKOUT_LOGIN_HREF = `/auth/login?redirect=${encodeURIComponent('/carrito')}&reason=checkout`;

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
            return 'Para finalizar la compra necesitás ingresar o crear una cuenta. Tu carrito queda listo para retomar.';
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
        <Box sx={{ py: { xs: 4, md: 6 }, minHeight: '70vh' }}>
            <Container maxWidth="xl">
                <Stack spacing={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, md: 4 },
                            borderRadius: 6,
                            border: '1px solid rgba(0,72,37,0.08)',
                            background:
                                'linear-gradient(135deg, rgba(255,251,244,0.96) 0%, rgba(248,239,224,0.96) 100%)',
                            boxShadow: '0 22px 46px rgba(0,72,37,0.08)',
                        }}
                    >
                        <Stack spacing={1}>
                            <Typography variant="overline" color="secondary.dark">
                                Compra en curso
                            </Typography>
                            <Typography variant="h3" fontWeight={700}>
                                Carrito
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {summaryText}
                            </Typography>
                        </Stack>
                    </Paper>

                    {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                    {!initialized ? (
                        <Stack alignItems="center" py={8}>
                            <CircularProgress />
                        </Stack>
                    ) : lines.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 5 }}>
                            <Stack spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                                <Typography variant="h5" fontWeight={700}>
                                    Tu carrito está vacío
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Agregá productos desde el catálogo para empezar tu pedido.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TooltipButton href="/productos" variant="contained" tooltip="Ir al catálogo de productos">
                                        Ir al catálogo
                                    </TooltipButton>
                                    {!customer && (
                                        <TooltipButton href={CHECKOUT_LOGIN_HREF} variant="outlined" tooltip="Ingresar o crear una cuenta">
                                            Ingresar o crear cuenta
                                        </TooltipButton>
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
                                        <Paper
                                            key={line.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 4,
                                                background:
                                                    'linear-gradient(180deg, rgba(255,251,244,0.92) 0%, rgba(255,255,255,0.72) 100%)',
                                            }}
                                        >
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
                                                        borderRadius: 3,
                                                        overflow: 'hidden',
                                                        bgcolor: 'grey.100',
                                                        border: '1px solid rgba(0,72,37,0.08)',
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
                                                        <TooltipIconButton
                                                            aria-label="Disminuir cantidad"
                                                            onClick={() => void handleChangeQuantity(line.id, line.quantity - 1)}
                                                            disabled={isPending}
                                                            tooltip="Disminuir cantidad"
                                                        >
                                                            <RemoveRoundedIcon />
                                                        </TooltipIconButton>
                                                        <Typography minWidth={24} textAlign="center" fontWeight={700}>
                                                            {line.quantity}
                                                        </Typography>
                                                        <TooltipIconButton
                                                            aria-label="Aumentar cantidad"
                                                            onClick={() => void handleChangeQuantity(line.id, line.quantity + 1)}
                                                            disabled={isPending}
                                                            tooltip="Aumentar cantidad"
                                                        >
                                                            <AddRoundedIcon />
                                                        </TooltipIconButton>
                                                    </Stack>

                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatCurrency(line.linePriceWithTax, currencyCode)}
                                                        </Typography>
                                                        <TooltipIconButton
                                                            aria-label="Eliminar producto"
                                                            onClick={() => void handleChangeQuantity(line.id, 0)}
                                                            disabled={isPending}
                                                            tooltip="Eliminar este producto"
                                                        >
                                                            <DeleteOutlineRoundedIcon />
                                                        </TooltipIconButton>
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>

                            <Paper
                                variant="outlined"
                                sx={{
                                    width: '100%',
                                    maxWidth: 380,
                                    p: 3,
                                    borderRadius: 5,
                                    position: { lg: 'sticky' },
                                    top: { lg: 110 },
                                    background:
                                        'linear-gradient(180deg, rgba(255,251,244,0.96) 0%, rgba(246,237,222,0.96) 100%)',
                                }}
                            >
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
                                    <TooltipButton
                                        href={customer ? '/checkout' : CHECKOUT_LOGIN_HREF}
                                        variant="contained"
                                        fullWidth
                                        tooltip={customer ? 'Pasar al checkout' : 'Ingresar o crear una cuenta para pagar'}
                                    >
                                        {customer ? 'Finalizar compra' : 'Ingresar para comprar'}
                                    </TooltipButton>
                                    <TooltipButton href="/productos" variant="outlined" fullWidth tooltip="Seguir explorando productos">
                                        Seguir comprando
                                    </TooltipButton>
                                </Stack>
                            </Paper>
                        </Stack>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
