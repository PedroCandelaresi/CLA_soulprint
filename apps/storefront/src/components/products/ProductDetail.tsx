'use client';
import React from 'react';
import { Grid, Typography, Stack, Divider, Chip } from '@mui/material';
import type { Product } from '@/types/product';
import ProductCarousel from './ProductCarousel';

interface ProductDetailProps {
    product: Product;
}

const ProductDetail = ({ product }: ProductDetailProps) => {
    const amount = product?.variants?.[0]?.price ?? 0;
    const currency = product?.variants?.[0]?.currencyCode || 'ARS';
    const price = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
    }).format(amount / 100);
    const stockLevel = product?.variants?.[0]?.stockLevel;
    const description = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const stockChip =
        stockLevel === 'IN_STOCK'
            ? { label: 'En stock', color: 'success' as const }
            : stockLevel === 'LOW_STOCK'
                ? { label: 'Stock bajo', color: 'warning' as const }
                : stockLevel === 'OUT_OF_STOCK'
                    ? { label: 'Sin stock', color: 'default' as const }
                    : { label: 'Disponibilidad a confirmar', color: 'default' as const };

    // Aggregate all assets
    const images: string[] = [];
    if (product.featuredAsset) images.push(product.featuredAsset.preview);
    if (product.assets) images.push(...product.assets.map(a => a.preview));

    // Deduplicate and Fix URLs
    const uniqueImages = [...new Set(images)];
    if (uniqueImages.length === 0) uniqueImages.push('/images/backgrounds/errorimg.svg');

    // We rely on next.config.ts rewrite to handle /assets/ paths
    // No need to prepend host
    // uniqueImages = uniqueImages.map(img => {
    //     if (img.startsWith('/assets/')) {
    //         const baseUrl = process.env.NEXT_PUBLIC_VENDURE_API_URL || 'http://localhost:3001/shop-api';
    //         const host = baseUrl.replace('/shop-api', '');
    //         return `${host}${img}`;
    //     }
    //     return img;
    // });

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

                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        La compra online y el carrito de clientes siguen en preparación.
                    </Typography>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default ProductDetail;
