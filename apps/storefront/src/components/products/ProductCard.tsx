'use client';
import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types/product';

interface ProductCardProps {
    product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
    // console.log(`Rendering card for: ${product.name}`, product);
    const amount = product?.variants?.[0]?.price ?? 0;
    const currency = product?.variants?.[0]?.currencyCode || 'ARS';
    const price = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
    }).format(amount / 100);
    const image = product?.featuredAsset?.preview ||
        product?.assets?.[0]?.preview ||
        '/images/backgrounds/errorimg.svg';
    const productHref = product.slug ? `/productos/${product.slug}` : '/productos';

    // Debug log to see what we are getting
    // console.log(`Product Image for ${product.name}:`, image);

    // If image is a relative path (starts with /assets/), we allow proper handling via rewrite or relative fetch
    // No need to prepend host if we have a rewrite rule in next.config.ts
    // or if we decide to use a custom loader.
    // However, keeping it simple: use relative path.
    // But next/image requires absolute or static.
    // Exception: if defined in remotePatterns (we have localhost implicit?), relative paths work if they resolve?
    // Let's stick to absolute for safety? No, rewrite is better.
    // If we use relative, <Image src="/assets/..." />
    // Next.js will fetch http://localhost:3000/assets/... -> Rewrite -> http://backend:3001/assets/...

    // So we just leave it alone.

    const [imgSrc, setImgSrc] = useState(image);

    useEffect(() => {
        setImgSrc(image);
    }, [image]);

    return (
        <Card
            sx={{
                p: 0,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                position: 'relative',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: (theme) => theme.shadows[10],
                    borderColor: 'transparent'
                }
            }}
            elevation={0}
        >
            <Box component={Link} href={productHref} sx={{ display: 'block', overflow: 'hidden' }}>
                <Image
                    src={imgSrc}
                    alt={product.name}
                    width={250}
                    height={268}
                    style={{ width: "100%", height: 'auto', objectFit: 'contain', padding: '20px', background: '#f5f5f5' }}
                    onError={() => setImgSrc('/images/backgrounds/errorimg.svg')}
                />
            </Box>

            <CardContent sx={{ p: 3, pt: 2 }}>
                <Typography
                    variant="h6"
                    component={Link}
                    href={`/productos/${product.slug}`}
                    sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                >
                    {product.name}
                </Typography>

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    mt={1}
                >
                    <Stack direction="row" alignItems="center">
                        <Typography variant="h6" fontWeight="bold">{price}</Typography>
                        {/* Discount could go here */}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default ProductCard;
