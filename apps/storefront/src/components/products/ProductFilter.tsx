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
        <Box p={2}>
            <List>
                <Typography variant="subtitle2" fontWeight={600} px={2} mb={2}>
                    Colecciones
                </Typography>
                {collections.map((collection) => (
                    <ListItemButton
                        key={collection.id}
                        selected={activeCollection === collection.slug}
                        onClick={() => handleCollectionClick(collection.slug)}
                        sx={{ borderRadius: 2, mb: 0.5 }}
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
