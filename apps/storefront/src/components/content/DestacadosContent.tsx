'use client';

import { Container, Typography, Box, Grid, Stack, Chip } from '@mui/material';
import Link from 'next/link';
import { IconHeartHandshake } from '@tabler/icons-react';
import FeaturedProductsCarrusel from '@/components/home/FeaturedProductsCarrusel';
import type { Product } from '@/types/product';
import TooltipButton from '@/components/ui/TooltipButton';

type DestacadosContentProps = {
    featuredProducts?: Product[];
};

export default function DestacadosContent({ featuredProducts = [] }: DestacadosContentProps) {
    return (
        <>
            <Container maxWidth="lg" sx={{ py: 8 }}>
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

                <Box
                    sx={{
                        mb: 8,
                        p: { xs: 4, md: 6 },
                        borderRadius: 5,
                        color: 'common.white',
                        background:
                            'linear-gradient(135deg, rgba(6,38,22,1) 0%, rgba(0,72,37,0.96) 52%, rgba(92,71,43,1) 100%)',
                        boxShadow: '0 28px 60px rgba(6, 38, 22, 0.28)',
                    }}
                >
                    <Grid container spacing={5}>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Stack spacing={3}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconHeartHandshake size={32} color="#f5ebd9" />
                                    <Typography variant="h4" fontWeight="700">
                                        Destacados con presencia, calidez y criterio
                                    </Typography>
                                </Box>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    No son solo los más vistos: son los que mejor expresan el pulso de la marca. Piezas con textura, memoria y una presencia que no necesita exagerar para sentirse especial.
                                </Typography>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    Este bloque reúne diseño con intención, materiales nobles y un lenguaje visual más sereno, pensado para quienes buscan objetos con identidad real.
                                </Typography>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    Es una selección para empezar por donde CLA Soulprint más se reconoce a sí misma: sensibilidad, detalle y una curaduría que busca emocionar sin perder funcionalidad.
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Stack spacing={2.5} sx={{ height: '100%', justifyContent: 'center' }}>
                                <Typography variant="overline" sx={{ letterSpacing: 1.8, color: 'rgba(255,255,255,0.6)' }}>
                                    CURADURÍA CON INTENCIÓN
                                </Typography>
                                <Typography variant="h5" fontWeight={700}>
                                    Lo mejor del catálogo, filtrado con una mirada más sensible y contemporánea
                                </Typography>
                                <Typography variant="body1" sx={{ lineHeight: 1.85, color: 'rgba(255,255,255,0.78)' }}>
                                    Una selección para quienes valoran diseño, durabilidad y un punto de personalidad. Si querés empezar por donde la marca más se luce, este es el lugar.
                                </Typography>
                                <TooltipButton
                                    variant="contained"
                                    size="large"
                                    href="/productos"
                                    tooltip="Ir al catálogo completo"
                                    sx={{
                                        alignSelf: 'start',
                                        px: 4,
                                        bgcolor: '#f5d7b5',
                                        color: '#201812',
                                        '&:hover': { bgcolor: '#f1c998' },
                                    }}
                                >
                                    Ver catálogo completo
                                </TooltipButton>
                            </Stack>
                        </Grid>
                    </Grid>
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
