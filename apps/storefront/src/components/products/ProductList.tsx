import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import ProductCard from './ProductCard';
import { Product } from '@/types/product';
import { IconMoodEmpty } from '@tabler/icons-react';

interface ProductListProps {
    products: Product[];
}

const ProductList = ({ products }: ProductListProps) => {
    if (products.length === 0) {
        return (
            <Box textAlign="center" py={10}>
                <IconMoodEmpty size={48} color="#9ca3af" />
                <Typography variant="h5" color="text.secondary" mt={2}>
                    No se encontraron productos en esta categoría.
                </Typography>
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            {products.map((product) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={product.productId || product.id}>
                    <ProductCard product={product} />
                </Grid>
            ))}
        </Grid>
    );
};

export default ProductList;
