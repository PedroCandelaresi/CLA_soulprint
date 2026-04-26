'use client';

import { Container, Typography, Box, Stack, Chip } from '@mui/material';
import FeaturedProductsCarrusel from '@/components/home/FeaturedProductsCarrusel';
import type { Product } from '@/types/product';

type DestacadosContentProps = {
    featuredProducts?: Product[];
};

export default function DestacadosContent({ featuredProducts = [] }: DestacadosContentProps) {
    return (
        <>
            <Container maxWidth="lg" sx={{ pt: 8, pb: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Stack direction="row" justifyContent="center" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
                        <Chip label="Selección destacada" color="secondary" variant="outlined" />
                        <Chip label="Curaduría CLA" color="primary" variant="outlined" />
                    </Stack>
                    <Typography variant="h2" fontWeight="700" sx={{ mt: 1, mb: 3 }}>
                        Una selección protagonista reunida en una sola pasada
                    </Typography>
                    <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '860px', mx: 'auto', lineHeight: 1.7 }}>
                        Piezas con carácter, sensibilidad visual y una presencia que se sostiene tanto en pantalla como en la experiencia real.
                    </Typography>
                </Box>
            </Container>

            {featuredProducts.length > 0 && <FeaturedProductsCarrusel products={featuredProducts} />}

            <Container maxWidth="lg" sx={{ pb: 10 }}>
                <Box
                    sx={{
                        background:
                            'linear-gradient(135deg, rgba(255,250,242,0.96) 0%, rgba(245,235,217,0.86) 100%)',
                        p: 6,
                        borderRadius: 3,
                        textAlign: 'center',
                        border: '1px solid rgba(199,164,107,0.28)',
                        boxShadow: '0 18px 44px rgba(6,38,22,0.08)',
                    }}
                >
                    <Typography variant="h4" fontStyle="italic" color="primary.dark" sx={{ lineHeight: 1.6 }}>
                        &quot;Destacados no es una etiqueta decorativa: es la parte del catálogo donde mejor se percibe la mezcla entre sensibilidad, calidad y criterio.&quot;
                    </Typography>
                </Box>
            </Container>
        </>
    );
}
