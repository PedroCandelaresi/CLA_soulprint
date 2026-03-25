'use client';
import { Alert, Button, Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types/product';
import { useCart } from '@/components/cart/CartProvider';

interface ProductCardProps {
    product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
    const amount = product?.variants?.[0]?.price ?? 0;
    const currency = product?.variants?.[0]?.currencyCode || 'ARS';
    const variantId = product?.variants?.[0]?.id;
    const stockLevel = product?.variants?.[0]?.stockLevel;
    const price = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
    }).format(amount / 100);
    const image = product?.featuredAsset?.preview ||
        product?.assets?.[0]?.preview ||
        '/images/backgrounds/errorimg.svg';
    const productHref = product.slug ? `/productos/${product.slug}` : '/productos';

    const [imgSrc, setImgSrc] = useState(image);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addItem } = useCart();

    useEffect(() => {
        setImgSrc(image);
    }, [image]);

    async function handleAddToCart() {
        if (!variantId) {
            setFeedback('Este producto no tiene una variante disponible para agregar.');
            return;
        }

        setIsSubmitting(true);
        setFeedback(null);
        try {
            await addItem(variantId, 1);
            setFeedback('Producto agregado al carrito.');
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'No se pudo agregar el producto al carrito.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const canAddToCart = Boolean(variantId) && stockLevel !== 'OUT_OF_STOCK';
    const addButtonLabel = stockLevel === 'OUT_OF_STOCK' ? 'Sin stock' : 'Agregar al carrito';

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
                    <Stack direction="row" alignItems="center" flex={1}>
                        <Typography variant="h6" fontWeight="bold">{price}</Typography>
                    </Stack>
                </Stack>

                <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => void handleAddToCart()}
                    disabled={!canAddToCart || isSubmitting}
                >
                    {isSubmitting ? 'Agregando...' : addButtonLabel}
                </Button>

                {feedback ? (
                    <Alert severity={feedback.includes('agregado') ? 'success' : 'error'} sx={{ mt: 2 }}>
                        {feedback}
                    </Alert>
                ) : null}
            </CardContent>
        </Card>
    );
};

export default ProductCard;
