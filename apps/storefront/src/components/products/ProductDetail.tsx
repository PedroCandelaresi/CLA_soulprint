'use client';
import React from 'react';
import { Box, Grid, Typography, Button, Rating, Stack, Divider, Chip } from '@mui/material';
import { IconShoppingCart, IconCheck } from '@tabler/icons-react';
import type { Product } from '@/types/product';
import ProductCarousel from './ProductCarousel';

interface ProductDetailProps {
    product: Product;
}

const ProductDetail = ({ product }: ProductDetailProps) => {
    const price = product?.variants?.[0]?.price ? (product.variants[0].price / 100).toFixed(2) : '0.00';
    const currency = product?.variants?.[0]?.currencyCode || 'USD';

    // Aggregate all assets
    const images = [];
    if (product.featuredAsset) images.push(product.featuredAsset.preview);
    if (product.assets) images.push(...product.assets.map(a => a.preview));

    // Deduplicate and Fix URLs
    let uniqueImages = [...new Set(images)];
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

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Rating value={4.5} readOnly precision={0.5} />
                        <Typography variant="body2" color="text.secondary">(24 reviews)</Typography>
                    </Stack>

                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                        ${price}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip icon={<IconCheck size={18} />} label="En Stock" color="success" size="small" variant="outlined" />
                        <Chip label="Envío Gratis" color="primary" size="small" variant="outlined" />
                    </Stack>

                    <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                        {product.description || "Descripción no disponible para este producto."}
                    </Typography>

                    <Divider />

                    <Box sx={{ py: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<IconShoppingCart />}
                            fullWidth
                            sx={{ py: 1.5, fontSize: '1.1rem' }}
                        >
                            Agregar al carrito
                        </Button>
                    </Box>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default ProductDetail;
