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
        <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
            <Box
                sx={{
                    mb: { xs: 4, md: 6 },
                    p: { xs: 3.5, md: 5.5 },
                    borderRadius: 2,
                    border: '1px solid rgba(0,72,37,0.08)',
                    background:
                        'linear-gradient(135deg, rgba(255,253,248,1) 0%, rgba(239,246,239,0.96) 52%, rgba(247,238,224,0.98) 100%)',
                    boxShadow: '0 18px 38px rgba(0,72,37,0.06)',
                    minWidth: 0,
                }}
            >
                <Typography
                    variant="overline"
                    sx={{ color: 'secondary.dark', fontWeight: 700 }}
                >
                    CLA Soulprint
                </Typography>
                <Typography variant="h2" fontWeight="700" color="primary.dark" mt={0.5}>
                    Tienda
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    mt={1.5}
                    sx={{ maxWidth: 760, lineHeight: 1.9, overflowWrap: 'break-word' }}
                >
                    {collectionSlug
                        ? `Filtrando por: ${collections.find(c => c.slug === collectionSlug)?.name || collectionSlug}.`
                        : 'Explorá piezas pensadas para llevar cerca recuerdos, afectos y pequeños rituales cotidianos.'}
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 4, md: 5 }} alignItems="flex-start" sx={{ minWidth: 0 }}>
                <Grid size={{ xs: 12, md: 3 }} sx={{ minWidth: 0 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            border: '1px solid rgba(0,72,37,0.08)',
                            bgcolor: '#fffdf8',
                            position: { md: 'sticky' },
                            top: { md: 104 },
                            borderRadius: 2,
                            boxShadow: '0 14px 30px rgba(0,72,37,0.06)',
                        }}
                    >
                        <ProductFilter collections={collections} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 9 }} sx={{ minWidth: 0 }}>
                    <ProductList products={products} />
                </Grid>
            </Grid>
        </Container>
    );
}
