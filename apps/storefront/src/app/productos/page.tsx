import { Container, Grid, Typography, Box, Paper } from '@mui/material';
import { listCollections, listProducts, listProductsByCollection } from '@/lib/vendure';
import type { CollectionItem } from '@/lib/vendure';
import ProductList from '@/components/products/ProductList';
import ProductFilter from '@/components/products/ProductFilter';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tienda | CLA',
    description: 'Explora nuestra colección de joyería personalizada.',
};

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const collectionSlug = typeof searchParams.collection === 'string' ? searchParams.collection : undefined;

    // Fetch Collections
    let collections: CollectionItem[] = [];
    try {
        collections = await listCollections();
    } catch (error) {
        console.error("Error fetching collections:", error);
    }

    // Fetch Products
    let products: Product[] = [];
    try {
        if (collectionSlug) {
            products = await listProductsByCollection(collectionSlug, { take: 24, skip: 0 });
        } else {
            products = await listProducts({ take: 24, skip: 0 });
        }

    } catch (error) {
        console.error("Error fetching products:", error);
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'primary.light', p: 4, mb: 2 }}>
                    <Typography variant="h3" fontWeight="700" color="primary.dark">
                        Tienda
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {collectionSlug ? `Filtrando por: ${collections.find(c => c.slug === collectionSlug)?.name || collectionSlug}` : 'Todos los productos'}
                    </Typography>
                </Box>

                <Grid container>
                    {/* Sidebar - Filters */}
                    <Grid size={{ xs: 12, md: 3 }} sx={{ borderRight: { md: '1px solid #e5e7eb' } }}>
                        <ProductFilter collections={collections} />
                    </Grid>

                    {/* Main Content - Product Grid */}
                    <Grid size={{ xs: 12, md: 9 }} sx={{ p: 3 }}>
                        <ProductList products={products} />
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}
