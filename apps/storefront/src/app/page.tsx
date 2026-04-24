import { listProducts, getFeaturedProducts, getHomeCarouselConfig } from '@/lib/vendure';
import type { HomeCarouselConfig } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';
import { Grid, Container, Typography, Box } from '@mui/material';
import CarruselDestacado from '@/components/home/CarruselDestacado';
import FeaturedProductsCarrusel from '@/components/home/FeaturedProductsCarrusel';

export const dynamic = 'force-dynamic';

export default async function Home() {
    let products: Product[] = [];
    let featuredProducts: Product[] = [];
    let carouselConfig: HomeCarouselConfig | null = null;

    try {
        carouselConfig = await getHomeCarouselConfig();
    } catch (error) {
        console.error('Error fetching home carousel config', error);
    }

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
            <CarruselDestacado
                slides={carouselConfig?.slides}
                settings={carouselConfig?.settings}
            />

            {featuredProducts.length > 0 && (
                <FeaturedProductsCarrusel products={featuredProducts} />
            )}

            <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
                <Box
                    mb={6}
                    textAlign="center"
                    sx={{
                        p: { xs: 3.5, md: 4.5 },
                        borderRadius: 4,
                        border: '1px solid rgba(0,72,37,0.08)',
                        background: 'linear-gradient(180deg, rgba(255,250,242,0.92) 0%, rgba(255,255,255,0.56) 100%)',
                    }}
                >
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
