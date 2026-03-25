'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Chip, Divider, Grid, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { Product } from '@/types/product';
import ProductCarousel from './ProductCarousel';
import { useCart } from '@/components/cart/CartProvider';

interface ProductDetailProps {
    product: Product;
}

const ProductDetail = ({ product }: ProductDetailProps) => {
    const primaryVariant = product?.variants?.[0];
    const amount = primaryVariant?.price ?? 0;
    const currency = primaryVariant?.currencyCode || 'ARS';
    const price = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
    }).format(amount / 100);
    const stockLevel = primaryVariant?.stockLevel;
    const description = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const stockChip =
        stockLevel === 'IN_STOCK'
            ? { label: 'En stock', color: 'success' as const }
            : stockLevel === 'LOW_STOCK'
                ? { label: 'Stock bajo', color: 'warning' as const }
                : stockLevel === 'OUT_OF_STOCK'
                    ? { label: 'Sin stock', color: 'default' as const }
                    : { label: 'Disponibilidad a confirmar', color: 'default' as const };

    const images: string[] = [];
    if (product.featuredAsset) images.push(product.featuredAsset.preview);
    if (product.assets) images.push(...product.assets.map(a => a.preview));

    const uniqueImages = [...new Set(images)];
    if (uniqueImages.length === 0) uniqueImages.push('/images/backgrounds/errorimg.svg');
    const [quantity, setQuantity] = useState(1);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addItem } = useCart();

    async function handleAddToCart() {
        if (!primaryVariant?.id) {
            setFeedback('Este producto no tiene una variante disponible para agregar.');
            return;
        }

        setIsSubmitting(true);
        setFeedback(null);
        try {
            await addItem(primaryVariant.id, quantity);
            setFeedback('Producto agregado al carrito.');
            setQuantity(1);
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'No se pudo agregar el producto al carrito.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const canAddToCart = Boolean(primaryVariant?.id) && stockLevel !== 'OUT_OF_STOCK';

    return (
        <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
                <ProductCarousel images={uniqueImages} alt={product.name} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                    <Typography variant="h3" fontWeight="bold">{product.name}</Typography>

                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {price}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label={stockChip.label} color={stockChip.color} size="small" variant="outlined" />
                    </Stack>

                    <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                        {description || "Descripción no disponible para este producto."}
                    </Typography>

                    <Divider />

                    <Stack spacing={2} sx={{ py: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconButton
                                aria-label="disminuir cantidad"
                                onClick={() => setQuantity(current => Math.max(1, current - 1))}
                                disabled={isSubmitting}
                            >
                                <RemoveIcon />
                            </IconButton>
                            <Typography minWidth={24} textAlign="center" fontWeight={700}>
                                {quantity}
                            </Typography>
                            <IconButton
                                aria-label="aumentar cantidad"
                                onClick={() => setQuantity(current => current + 1)}
                                disabled={isSubmitting}
                            >
                                <AddIcon />
                            </IconButton>
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => void handleAddToCart()}
                                disabled={!canAddToCart || isSubmitting}
                            >
                                {isSubmitting ? 'Agregando...' : 'Agregar al carrito'}
                            </Button>
                            <Button component={Link} href="/carrito" variant="outlined" size="large">
                                Ver carrito
                            </Button>
                        </Stack>

                        {feedback ? (
                            <Alert severity={feedback.includes('agregado') ? 'success' : 'error'}>
                                {feedback}
                            </Alert>
                        ) : null}
                    </Stack>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default ProductDetail;
