'use client';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/product';
import ProductBadges from './ProductBadges';
import { resolveBadges } from '@/lib/badges/resolveBadges';
import VendureImage from '@/components/common/VendureImage';

interface ProductCardProps {
    product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
    const variantPrices = product.variants
        .map((variant) => variant.price)
        .filter((price) => Number.isFinite(price));
    const amount = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
    const hasPriceRange = variantPrices.length > 1 && new Set(variantPrices).size > 1;
    const currency = product?.variants?.[0]?.currencyCode || 'ARS';
    const price = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
    }).format(amount / 100);

    const image =
        product?.featuredAsset?.preview ||
        product?.assets?.[0]?.preview ||
        '/images/backgrounds/errorimg.svg';

    const productHref = product.slug ? `/productos/${product.slug}` : '/productos';
    const collectionBadges = useMemo(
        () => product.collections?.flatMap((c) => c.customFields?.badges ?? []) ?? [],
        [product.collections],
    );

    const productBadges = useMemo(
        () =>
            resolveBadges({
                productBadges: product.customFields?.badges,
                collectionBadges,
            }),
        [product.customFields?.badges, collectionBadges],
    );

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: '100%',
                minWidth: 0,
                border: '1px solid rgba(0,72,37,0.09)',
                borderRadius: 2,
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(255,253,248,1) 0%, rgba(246,244,237,1) 100%)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 32%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                },
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 34px rgba(0,72,37,0.12)',
                    borderColor: 'rgba(0,72,37,0.16)',
                },
            }}
        >
            {/* Image area */}
            <Box
                component={Link}
                href={productHref}
                sx={{
                    display: 'block',
                    overflow: 'hidden',
                    bgcolor: 'rgba(239,243,235,0.82)',
                    flexShrink: 0,
                    aspectRatio: '1 / 1',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: '14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.52)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <VendureImage
                    src={image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 272px"
                    style={{ objectFit: 'contain', padding: '24px' }}
                />
                {productBadges.length > 0 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                            p: 1.25,
                        }}
                    >
                        <ProductBadges badges={productBadges} size="sm" />
                    </Box>
                )}
            </Box>

            {/* Content */}
            <CardContent
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 2.5, md: 2.75 },
                    pt: 2.35,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 1.6,
                }}
            >
                <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
                    <Typography
                        variant="body1"
                        fontWeight={600}
                        component={Link}
                        href={productHref}
                        sx={{
                            textDecoration: 'none',
                            color: 'text.primary',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            '&:hover': { color: 'primary.main' },
                            transition: 'color 0.2s ease',
                        }}
                    >
                        {product.name}
                    </Typography>
                </Stack>

                <Stack spacing={0.8}>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                        {hasPriceRange ? `Desde ${price}` : price}
                    </Typography>
                    <Typography
                        component={Link}
                        href={productHref}
                        variant="body2"
                        sx={{
                            textDecoration: 'none',
                            color: 'text.secondary',
                            fontWeight: 600,
                            letterSpacing: 0,
                            '&:hover': { color: 'primary.main' },
                        }}
                    >
                        Ver detalle
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default ProductCard;
