'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useState } from 'react';
import type { CartLine } from '@/types/cart';
import { useCart } from './CartProvider';
import { GetnetCheckoutButton } from '../payments/GetnetCheckoutButton';
import AndreaniShippingPanel from '../logistics/AndreaniShippingPanel';

function formatMoney(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount / 100);
}

export default function CartPageContent() {
    const { cart, error, clearError, isInitializing, isMutating, updateLineQuantity, removeLine } = useCart();
    const [busyLineId, setBusyLineId] = useState<string | null>(null);

    async function handleQuantityChange(line: CartLine, quantity: number) {
        setBusyLineId(line.id);
        try {
            await updateLineQuantity(line.id, quantity);
        } finally {
            setBusyLineId(null);
        }
    }

    async function handleRemove(lineId: string) {
        setBusyLineId(lineId);
        try {
            await removeLine(lineId);
        } finally {
            setBusyLineId(null);
        }
    }

    if (isInitializing) {
        return (
            <Box minHeight="40vh" display="grid" sx={{ placeItems: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress />
                    <Typography color="text.secondary">Cargando carrito...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!cart || cart.lines.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, textAlign: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <Typography variant="h3" fontWeight={700}>Tu carrito está vacío</Typography>
                    <Typography color="text.secondary" maxWidth={520}>
                        Agregá productos reales desde la tienda y acá vas a ver la orden activa de Vendure.
                    </Typography>
                    <Button component={Link} href="/productos" variant="contained" size="large">
                        Ir a la tienda
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h3" fontWeight={700}>Carrito</Typography>
                <Typography color="text.secondary">
                    {cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'} en tu orden activa
                </Typography>
            </Box>

            {error ? (
                <Alert severity="error" onClose={clearError}>
                    {error}
                </Alert>
            ) : null}

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
                <Stack spacing={2} flex={1} width="100%">
                    {cart.lines.map((line) => {
                        const image = line.featuredAsset?.preview || '/images/backgrounds/errorimg.svg';
                        const itemBusy = isMutating && busyLineId === line.id;

                        return (
                            <Card key={line.id} variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                        <Box
                                            sx={{
                                                width: { xs: '100%', sm: 140 },
                                                minWidth: { sm: 140 },
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                bgcolor: '#f5f5f5',
                                            }}
                                        >
                                            <Image
                                                src={image}
                                                alt={line.productVariant.product.name}
                                                width={140}
                                                height={140}
                                                style={{ width: '100%', height: 'auto', display: 'block' }}
                                            />
                                        </Box>

                                        <Stack spacing={1.5} flex={1}>
                                            <Box>
                                                {line.productVariant.product.slug ? (
                                                    <Typography
                                                        component={Link}
                                                        href={`/productos/${line.productVariant.product.slug}`}
                                                        variant="h5"
                                                        sx={{
                                                            textDecoration: 'none',
                                                            color: 'text.primary',
                                                            '&:hover': { color: 'primary.main' },
                                                        }}
                                                    >
                                                        {line.productVariant.product.name}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="h5" color="text.primary">
                                                        {line.productVariant.product.name}
                                                    </Typography>
                                                )}
                                                <Typography color="text.secondary">
                                                    Variante: {line.productVariant.name}
                                                </Typography>
                                            </Box>

                                            <Stack
                                                direction={{ xs: 'column', md: 'row' }}
                                                spacing={2}
                                                alignItems={{ xs: 'flex-start', md: 'center' }}
                                                justifyContent="space-between"
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <IconButton
                                                        aria-label="disminuir cantidad"
                                                        onClick={() => {
                                                            if (line.quantity === 1) {
                                                                void handleRemove(line.id);
                                                                return;
                                                            }
                                                            void handleQuantityChange(line, line.quantity - 1);
                                                        }}
                                                        disabled={itemBusy}
                                                    >
                                                        <RemoveIcon />
                                                    </IconButton>
                                                    <Typography minWidth={24} textAlign="center" fontWeight={700}>
                                                        {itemBusy ? '...' : line.quantity}
                                                    </Typography>
                                                    <IconButton
                                                        aria-label="aumentar cantidad"
                                                        onClick={() => void handleQuantityChange(line, line.quantity + 1)}
                                                        disabled={itemBusy}
                                                    >
                                                        <AddIcon />
                                                    </IconButton>
                                                </Stack>

                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Box textAlign={{ xs: 'left', md: 'right' }}>
                                                        <Typography color="text.secondary">
                                                            Unitario: {formatMoney(line.unitPriceWithTax, cart.currencyCode)}
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatMoney(line.linePriceWithTax, cart.currencyCode)}
                                                        </Typography>
                                                    </Box>
                                                    <IconButton
                                                        aria-label="eliminar item"
                                                        color="error"
                                                        onClick={() => void handleRemove(line.id)}
                                                        disabled={itemBusy}
                                                    >
                                                        <DeleteOutlineIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>

                <Paper
                    variant="outlined"
                    sx={{
                        width: '100%',
                        maxWidth: 360,
                        p: 3,
                        borderRadius: 4,
                        position: { lg: 'sticky' },
                        top: { lg: 108 },
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h5" fontWeight={700}>Resumen</Typography>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography color="text.secondary">Subtotal</Typography>
                            <Typography>{formatMoney(cart.subTotalWithTax, cart.currencyCode)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography color="text.secondary">Envío</Typography>
                            <Typography>{formatMoney(cart.shippingWithTax, cart.currencyCode)}</Typography>
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight={700}>Total</Typography>
                            <Typography variant="h5" fontWeight={700}>
                                {formatMoney(cart.totalWithTax, cart.currencyCode)}
                            </Typography>
                        </Stack>
                        <Divider />
                        <AndreaniShippingPanel cart={cart} />
                        <Divider />
                        <GetnetCheckoutButton cart={cart} />
                        <Button component={Link} href="/productos" variant="outlined" fullWidth>
                            Seguir comprando
                        </Button>
                    </Stack>
                </Paper>
            </Stack>
        </Stack>
    );
}
