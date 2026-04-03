'use client';

import { useState } from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, Button, Container, Drawer, Grid, Paper, Typography } from '@mui/material';
import ProductFilter from '@/components/products/ProductFilter';
import ProductList from '@/components/products/ProductList';
import type { CollectionItem } from '@/lib/vendure';
import type { Product } from '@/types/product';

interface ProductosPageContentProps {
    collections: CollectionItem[];
    products: Product[];
    collectionSlug?: string;
}

export default function ProductosPageContent({
    collections,
    products,
    collectionSlug,
}: ProductosPageContentProps) {
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

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
                    <Grid
                        size={{ xs: 12, md: 3 }}
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            borderRight: { md: '1px solid' },
                            borderColor: { md: 'divider' },
                        }}
                    >
                        <ProductFilter collections={collections} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }} sx={{ p: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<FilterListIcon />}
                            onClick={() => setIsFilterDrawerOpen(true)}
                            sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 3 }}
                        >
                            Filtrar
                        </Button>

                        <ProductList products={products} />
                    </Grid>
                </Grid>
            </Paper>

            <Drawer
                anchor="left"
                open={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: 280, sm: 320 } } }}
            >
                <Box sx={{ width: '100%' }}>
                    <ProductFilter
                        collections={collections}
                        onNavigate={() => setIsFilterDrawerOpen(false)}
                    />
                </Box>
            </Drawer>
        </Container>
    );
}
