import { Container, Grid, Typography, Box, Paper } from '@mui/material';
import { fetchVendure, GET_COLLECTIONS_QUERY, SEARCH_PRODUCTS_QUERY, GET_PRODUCTS_QUERY, GET_PRODUCTS_BY_COLLECTION_QUERY } from '@/lib/vendure';
import ProductList from '@/components/products/ProductList';
import ProductFilter from '@/components/products/ProductFilter';
import { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tienda | CLA',
    description: 'Explora nuestra colección de joyería personalizada.',
};

interface SearchResult {
    items: any[];
    totalItems: number;
}

interface CollectionResult {
    items: any[];
}

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const collectionSlug = typeof searchParams.collection === 'string' ? searchParams.collection : undefined;

    // Fetch Collections
    let collections = [];
    try {
        const collectionsData = await fetchVendure<{ collections: CollectionResult }>(GET_COLLECTIONS_QUERY);
        collections = collectionsData.collections.items;
    } catch (error) {
        console.error("Error fetching collections:", error);
    }

    // Fetch Products
    let products: Product[] = [];
    try {
        if (collectionSlug) {
            // Prefiere products() para resultados instantáneos; fallback a search si falla
            try {
                const data = await fetchVendure<{ products: { items: Product[] } }>(GET_PRODUCTS_BY_COLLECTION_QUERY, {
                    collectionSlug,
                    take: 24,
                    skip: 0,
                });
                products = data.products.items;
            } catch (err) {
                console.warn('Fallback to search API for collection', err);
                const input: any = { take: 24, skip: 0, groupByProduct: true, collectionSlug };
                const searchData = await fetchVendure<{ search: SearchResult }>(SEARCH_PRODUCTS_QUERY, { input });

                products = searchData.search.items.map(p => ({
                    id: p.productId,
                    name: p.productName,
                    slug: p.slug,
                    description: p.description,
                    featuredAsset: p.productAsset,
                    variants: [{
                        price: p.price.value || p.price.min,
                        currencyCode: 'ARS'
                    }]
                }));
            }
        } else {
            // No filter: Fetch DIRECTLY from DB (bypass Search Index)
            // This ensures new products appear immediately.
            const data = await fetchVendure<{ products: { items: Product[] } }>(GET_PRODUCTS_QUERY, { take: 24, skip: 0 }); // Import GET_PRODUCTS_QUERY if needed, it is already imported? No, check imports.
            products = data.products.items;
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
