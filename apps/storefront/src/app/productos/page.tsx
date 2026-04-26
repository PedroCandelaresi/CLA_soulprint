import { Container, Grid, Typography, Box, Paper } from '@mui/material';
import { listCollections, listProducts, listProductsByCollection } from '@/lib/vendure';
import type { CollectionItem } from '@/lib/vendure';
import ProductList from '@/components/products/ProductList';
import ProductFilter from '@/components/products/ProductFilter';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tienda | CLA Soulprint',
    description: 'Explorá la colección completa con la nueva estética inspirada en CLA Soulprint.',
};

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const collectionSlug =
        typeof resolvedSearchParams.collection === 'string'
            ? resolvedSearchParams.collection
            : undefined;

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
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3.5, md: 5 },
                    borderRadius: 4,
                    border: '1px solid rgba(0,72,37,0.08)',
                    background:
                        'linear-gradient(135deg, rgba(255,253,248,1) 0%, rgba(247,238,224,1) 46%, rgba(241,231,213,1) 100%)',
                    boxShadow: '0 20px 44px rgba(0,72,37,0.06)',
                }}
            >
                <Typography
                    variant="overline"
                    sx={{ color: 'secondary.dark', letterSpacing: 3.2, fontWeight: 700 }}
                >
                    CLA Soulprint
                </Typography>
                <Typography variant="h2" fontWeight="700" color="primary.dark" mt={0.5}>
                    Tienda
                </Typography>
                <Typography variant="body1" color="text.secondary" mt={1.5} sx={{ maxWidth: 760, lineHeight: 1.9 }}>
                    {collectionSlug
                        ? `Filtrando por: ${collections.find(c => c.slug === collectionSlug)?.name || collectionSlug}.`
                        : 'Explorá toda la colección desde una interfaz más cálida, editorial y alineada con la identidad visual de CLA.'}
                </Typography>
            </Box>

            <Grid container spacing={3} alignItems="flex-start">
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            border: '1px solid rgba(0,72,37,0.08)',
                            bgcolor: '#fffdf8',
                        position: { md: 'sticky' },
                        top: { md: 96 },
                        borderRadius: 4,
                    }}
                >
                    <ProductFilter collections={collections} />
                </Paper>
            </Grid>

                <Grid size={{ xs: 12, md: 9 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 3.5 },
                            border: '1px solid rgba(0,72,37,0.08)',
                            bgcolor: '#fffdf8',
                            borderRadius: 4,
                        }}
                    >
                        <ProductList products={products} />
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
