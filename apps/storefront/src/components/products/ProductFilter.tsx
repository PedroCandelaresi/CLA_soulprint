'use client';

import React from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Button
} from '@mui/material';
import { IconCategory, IconX } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Collection {
    id: string;
    name: string;
    slug: string;
}

interface ProductFilterProps {
    collections: Collection[];
}

const ProductFilter = ({ collections }: ProductFilterProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeCollection = searchParams.get('collection');

    const handleCollectionClick = (slug: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (activeCollection === slug) {
            params.delete('collection');
        } else {
            params.set('collection', slug);
        }
        router.push(`/productos?${params.toString()}`);
    };

    const handleReset = () => {
        router.push('/productos');
    };

    return (
        <Box p={3}>
            <List>
                <Typography
                    variant="overline"
                    fontWeight={700}
                    px={1.5}
                    mb={2}
                    sx={{ color: 'secondary.dark', letterSpacing: 2.4 }}
                >
                    Categorías
                </Typography>
                {collections.map((collection) => (
                    <ListItemButton
                        key={collection.id}
                        selected={activeCollection === collection.slug}
                        onClick={() => handleCollectionClick(collection.slug)}
                        sx={{
                            borderRadius: 999,
                            mb: 1,
                            border: '1px solid transparent',
                            px: 1.5,
                            '&.Mui-selected': {
                                borderColor: 'rgba(0,72,37,0.14)',
                                bgcolor: 'rgba(0,72,37,0.06)',
                            },
                            '&.Mui-selected:hover': {
                                bgcolor: 'rgba(0,72,37,0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            <IconCategory size={20} />
                        </ListItemIcon>
                        <ListItemText primary={collection.name} />
                    </ListItemButton>
                ))}
            </List>

            <Divider sx={{ my: 3 }} />

            <Box px={2}>
                <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    startIcon={<IconX size={18} />}
                    onClick={handleReset}
                    disabled={!activeCollection}
                >
                    Limpiar Filtros
                </Button>
            </Box>
        </Box>
    );
};

export default ProductFilter;
