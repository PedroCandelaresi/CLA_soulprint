import { listProducts } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';
import { Grid, Container, Typography, Box } from '@mui/material';
import CarruselDestacado from '@/components/home/CarruselDestacado';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let products: Product[] = [];
  try {
    products = await listProducts({ take: 24, skip: 0 });
  } catch (error) {
    console.error("Error fetching homepage products", error);
  }

  return (
    <>
      <CarruselDestacado />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box mb={6} textAlign="center">
          <Typography variant="h2" fontWeight="700" gutterBottom>Nuestros Productos</Typography>
          <Typography variant="subtitle1" color="text.secondary">Descubre lo mejor para vos y tu familia</Typography>
        </Box>

        {products.length > 0 ? (
          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }} >
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box textAlign="center" py={10}>
            <Typography variant="h5" color="text.secondary">No se encontraron productos disponibles en este momento.</Typography>
          </Box>
        )}

      </Container>
    </>
  );
}
