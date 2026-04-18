import Image from 'next/image';
import { listProducts, getFeaturedProducts } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';
import { Grid, Container, Typography, Box, Button, Paper, Stack } from '@mui/material';
import CarruselDestacado from '@/components/home/CarruselDestacado';
import FeaturedProductsCarrusel from '@/components/home/FeaturedProductsCarrusel';

export const dynamic = 'force-dynamic';

export default async function Home() {
    let products: Product[] = [];
    let featuredProducts: Product[] = [];

    try {
        products = await listProducts({ take: 24, skip: 0 });
    } catch (error) {
        console.error('Error fetching homepage products', error);
    }

    try {
        featuredProducts = await getFeaturedProducts({ take: 12, skip: 0 });
    } catch {
        // Si la etiqueta "destacado" no existe todavía, se ignora silenciosamente
    }

    return (
        <>
            <CarruselDestacado />

            {featuredProducts.length > 0 && (
                <FeaturedProductsCarrusel products={featuredProducts} />
            )}

            <Box sx={{ py: { xs: 7, md: 11 } }}>
                <Container maxWidth="lg">
                    <Grid container spacing={{ xs: 4, md: 5 }} alignItems="stretch">
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    p: { xs: 3.5, md: 5 },
                                    border: '1px solid rgba(0,72,37,0.08)',
                                    background:
                                        'linear-gradient(135deg, rgba(255,253,248,1) 0%, rgba(248,240,225,1) 100%)',
                                }}
                            >
                                <Stack spacing={2.2}>
                                    <Typography
                                        variant="overline"
                                        sx={{ color: 'secondary.dark', letterSpacing: 3.2, fontWeight: 700 }}
                                    >
                                        Estética CLA
                                    </Typography>
                                    <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1.15 }}>
                                        Una tienda más editorial, cálida y memorable.
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ lineHeight: 1.9, fontSize: '1.02rem' }}>
                                        En esta evolución de demo2 tomamos la sensibilidad visual de CLA Soulprint:
                                        verdes profundos, cremas suaves, fotografía afectiva y una
                                        navegación con más identidad.
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ lineHeight: 1.9 }}>
                                        El resultado busca sentirse más humano y más premium, sin perder la estructura
                                        funcional del storefront actual.
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} pt={1}>
                                        <Button variant="contained" href="/productos" size="large">
                                            Explorar tienda
                                        </Button>
                                        <Button variant="outlined" href="/sobre-nosotros" size="large">
                                            Ver identidad
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 7 }}>
                            <Grid container spacing={3} sx={{ height: '100%' }}>
                                <Grid size={{ xs: 12, sm: 7 }}>
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            minHeight: { xs: 300, md: 100 },
                                            height: '100%',
                                            borderRadius: 5,
                                            overflow: 'hidden',
                                            boxShadow: '0 24px 44px rgba(0,72,37,0.1)',
                                        }}
                                    >
                                        <Image
                                            src="/images/carrousel/carrousel2.png"
                                            alt="Colección emocional CLA Soulprint"
                                            fill
                                            sizes="(max-width: 900px) 100vw, 40vw"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <Stack spacing={3} sx={{ height: '100%' }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 3,
                                                border: '1px solid rgba(0,72,37,0.08)',
                                                bgcolor: '#fffdf8',
                                            }}
                                        >
                                            <Typography variant="overline" sx={{ color: 'secondary.dark', letterSpacing: 2.4 }}>
                                                01
                                            </Typography>
                                            <Typography variant="h5" fontWeight={700} mt={1}>
                                                Paleta con identidad
                                            </Typography>
                                            <Typography color="text.secondary" mt={1.2} sx={{ lineHeight: 1.8 }}>
                                                Verdes botánicos, cremas suaves y acentos dorados para un look más
                                                sensible y distintivo.
                                            </Typography>
                                        </Paper>

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 3,
                                                border: '1px solid rgba(0,72,37,0.08)',
                                                bgcolor: '#fffaf2',
                                                flexGrow: 1,
                                            }}
                                        >
                                            <Typography variant="overline" sx={{ color: 'secondary.dark', letterSpacing: 2.4 }}>
                                                02
                                            </Typography>
                                            <Typography variant="h5" fontWeight={700} mt={1}>
                                                Fotografía que cuenta
                                            </Typography>
                                            <Typography color="text.secondary" mt={1.2} sx={{ lineHeight: 1.8 }}>
                                                La tienda deja de sentirse genérica y pasa a construir atmósfera desde
                                                el primer scroll.
                                            </Typography>
                                        </Paper>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
                <Box mb={6} textAlign="center">
                    <Typography
                        variant="overline"
                        sx={{ color: 'secondary.dark', letterSpacing: 4, fontSize: '0.72rem', fontWeight: 700 }}
                    >
                        Catálogo completo
                    </Typography>
                    <Typography variant="h3" fontWeight={700} mt={0.5}>
                        Piezas para seguir explorando
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" mt={1}>
                        Una selección de productos presentada con un lenguaje visual más cuidado y coherente.
                    </Typography>
                </Box>

                {products.length > 0 ? (
                    <Grid container spacing={3}>
                        {products.map((product) => (
                            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                <ProductCard product={product} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Box textAlign="center" py={10}>
                        <Typography variant="h5" color="text.secondary">
                            No se encontraron productos disponibles en este momento.
                        </Typography>
                    </Box>
                )}
            </Container>
        </>
    );
}
