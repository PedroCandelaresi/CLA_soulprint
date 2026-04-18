'use client';

import { Container, Typography, Box, Grid, Button, Stack } from '@mui/material';
import Link from 'next/link';
import { IconHeartHandshake } from '@tabler/icons-react';
import FeaturedProductsCarrusel from '@/components/home/FeaturedProductsCarrusel';
import type { Product } from '@/types/product';

type DestacadosContentProps = {
    featuredProducts?: Product[];
};

export default function DestacadosContent({ featuredProducts = [] }: DestacadosContentProps) {
    return (
        <>
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="overline" color="primary" fontWeight="bold" letterSpacing={2}>
                        LA SELECCION QUE ESTA PEGANDO
                    </Typography>
                    <Typography variant="h2" fontWeight="700" sx={{ mt: 1, mb: 3 }}>
                        Lo mas fuerte de la tienda, reunido en una sola pasada
                    </Typography>
                    <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '860px', mx: 'auto', lineHeight: 1.7 }}>
                        Acá vive esa mezcla que nos encanta: productos con facha, calidad que se siente de verdad y una vibra bien arriba para quienes eligen objetos con personalidad, no cosas que pasan sin dejar marca.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        mb: 8,
                        p: { xs: 4, md: 6 },
                        borderRadius: 5,
                        color: 'common.white',
                        background:
                            'linear-gradient(135deg, rgba(23,23,23,1) 0%, rgba(61,43,33,1) 52%, rgba(106,67,43,1) 100%)',
                        boxShadow: '0 28px 60px rgba(33, 24, 20, 0.28)',
                    }}
                >
                    <Grid container spacing={5}>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Stack spacing={3}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconHeartHandshake size={32} color="#f7d7b0" />
                                    <Typography variant="h4" fontWeight="700">
                                        Destacados con presencia, onda y nivel
                                    </Typography>
                                </Box>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    No son solo los mas vistos ni los que mas giran: son los que mejor resumen el pulso de la marca. Piezas con textura, carácter y esa clase de presencia que levanta un espacio sin tener que explicarse demasiado.
                                </Typography>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    Si estás entre los 20 y los 30 y buscás cosas que hablen tu idioma visual, este bloque está armado para vos: diseño con intención, materiales que bancan el uso real y una selección que entra por los ojos pero se sostiene en calidad.
                                </Typography>
                                <Typography variant="body1" fontSize="1.12rem" sx={{ lineHeight: 1.95, color: 'rgba(255,255,255,0.82)' }}>
                                    Acá no venís a scrollear por scrollear. Venís a encontrar eso que te hace pensar “sí, esto tiene toda la onda” y además sabés que va a responder cuando pase de la pantalla a tu casa.
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Stack spacing={2.5} sx={{ height: '100%', justifyContent: 'center' }}>
                                <Typography variant="overline" sx={{ letterSpacing: 1.8, color: 'rgba(255,255,255,0.6)' }}>
                                    CALIDAD QUE NO CARETEA
                                </Typography>
                                <Typography variant="h5" fontWeight={700}>
                                    Lo mejor del catálogo, filtrado con criterio y bastante actitud
                                </Typography>
                                <Typography variant="body1" sx={{ lineHeight: 1.85, color: 'rgba(255,255,255,0.78)' }}>
                                    Una selección para quienes valoran diseño, durabilidad y un punto de personalidad. Si querés empezar por donde la marca más se luce, este es el lugar.
                                </Typography>
                                <Button variant="contained" size="large" component={Link} href="/productos" sx={{ alignSelf: 'start', px: 4, bgcolor: '#f5d7b5', color: '#201812', '&:hover': { bgcolor: '#f1c998' } }}>
                                    Ver catálogo completo
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Container>

            {featuredProducts.length > 0 && <FeaturedProductsCarrusel products={featuredProducts} />}

            <Container maxWidth="lg" sx={{ pb: 10 }}>
                <Box sx={{ bgcolor: 'primary.light', p: 6, borderRadius: 4, textAlign: 'center' }}>
                    <Typography variant="h4" fontStyle="italic" color="primary.dark" sx={{ lineHeight: 1.6 }}>
                        &quot;Destacados no es una etiqueta decorativa: es la parte del catálogo donde mejor se nota la mezcla entre facha, calidad y criterio.&quot;
                    </Typography>
                </Box>
            </Container>
        </>
    );
}
