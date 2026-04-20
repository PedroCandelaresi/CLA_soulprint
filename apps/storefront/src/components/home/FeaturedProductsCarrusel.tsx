'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Container, Stack } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/types/product';
import TooltipButton from '@/components/ui/TooltipButton';
import TooltipIconButton from '@/components/ui/TooltipIconButton';

interface FeaturedProductsCarruselProps {
    products: Product[];
}

const CARD_WIDTH = 272;
const CARD_GAP = 24;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;

const FeaturedProductsCarrusel = ({ products }: FeaturedProductsCarruselProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState, { passive: true });
        return () => el.removeEventListener('scroll', updateScrollState);
    }, [updateScrollState, products]);

    const handleNext = () => {
        scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
    };

    const handlePrev = () => {
        scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
    };

    if (products.length === 0) return null;

    return (
        <Box
            sx={{
                py: { xs: 6, md: 10 },
                bgcolor: 'transparent',
            }}
        >
            <Container maxWidth="lg">
                <Box
                    sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: 4,
                        border: '1px solid rgba(0,72,37,0.08)',
                        background: 'linear-gradient(180deg, rgba(255,250,242,0.92) 0%, rgba(255,255,255,0.66) 100%)',
                        boxShadow: '0 24px 46px rgba(0,72,37,0.08)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
                        justifyContent="space-between"
                        mb={4}
                        gap={2}
                    >
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{ color: 'secondary.dark', letterSpacing: 4, fontSize: '0.72rem', fontWeight: 700 }}
                            >
                                Curaduría especial
                            </Typography>
                            <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5, lineHeight: 1.2 }}>
                                Productos Destacados
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 620 }}>
                                Una pasada por las piezas más expresivas del catálogo, presentadas en una grilla más limpia y contemporánea.
                            </Typography>
                        </Box>
                        <TooltipButton
                            variant="outlined"
                            href="/productos"
                            size="medium"
                            tooltip="Ver el catálogo completo"
                            sx={{
                                borderColor: 'rgba(0,72,37,0.16)',
                                color: 'primary.main',
                                bgcolor: 'rgba(255,255,255,0.5)',
                                fontWeight: 600,
                                px: 3,
                                whiteSpace: 'nowrap',
                                '&:hover': { bgcolor: 'primary.main', color: 'common.white' },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Ver todos
                        </TooltipButton>
                    </Stack>

                    <Box sx={{ position: 'relative' }}>
                        <TooltipIconButton
                            onClick={handlePrev}
                            disabled={!canScrollLeft}
                            aria-label="Anterior"
                            tooltip="Desplazar hacia la izquierda"
                            sx={{
                                position: 'absolute',
                                left: { xs: 0, md: -24 },
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 2,
                                bgcolor: '#fffaf2',
                                border: '1px solid rgba(0,72,37,0.1)',
                                boxShadow: '0 8px 18px rgba(0,72,37,0.08)',
                                width: 44,
                                height: 44,
                                opacity: canScrollLeft ? 1 : 0.35,
                                transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': {
                                    bgcolor: '#fffefb',
                                    boxShadow: '0 10px 24px rgba(0,72,37,0.14)',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#fffaf2',
                                    borderColor: 'rgba(0,72,37,0.1)',
                                },
                            }}
                        >
                            <IconChevronLeft size={20} stroke={2} />
                        </TooltipIconButton>

                        <Box
                            ref={scrollRef}
                            sx={{
                                display: 'flex',
                                gap: `${CARD_GAP}px`,
                                overflowX: 'auto',
                                scrollBehavior: 'smooth',
                                px: { xs: 0, md: 0.5 },
                                py: 1.5,
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': {
                                    display: 'none',
                                },
                                maskImage: {
                                    xs: 'none',
                                    sm: 'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
                                },
                            }}
                        >
                            {products.map((product) => (
                                <Box
                                    key={product.id}
                                    sx={{ flex: `0 0 ${CARD_WIDTH}px`, minWidth: CARD_WIDTH }}
                                >
                                    <ProductCard product={product} />
                                </Box>
                            ))}
                        </Box>

                        <TooltipIconButton
                            onClick={handleNext}
                            disabled={!canScrollRight}
                            aria-label="Siguiente"
                            tooltip="Desplazar hacia la derecha"
                            sx={{
                                position: 'absolute',
                                right: { xs: 0, md: -24 },
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 2,
                                bgcolor: '#fffaf2',
                                border: '1px solid rgba(0,72,37,0.1)',
                                boxShadow: '0 8px 18px rgba(0,72,37,0.08)',
                                width: 44,
                                height: 44,
                                opacity: canScrollRight ? 1 : 0.35,
                                transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': {
                                    bgcolor: '#fffefb',
                                    boxShadow: '0 10px 24px rgba(0,72,37,0.14)',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#fffaf2',
                                    borderColor: 'rgba(0,72,37,0.1)',
                                },
                            }}
                        >
                            <IconChevronRight size={20} stroke={2} />
                        </TooltipIconButton>
                    </Box>

                    {products.length > 4 && (
                        <Stack direction="row" justifyContent="center" mt={4} spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                                {products.length} piezas disponibles · Deslizá para ver más
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </Container>
        </Box>
    );
};

export default FeaturedProductsCarrusel;
