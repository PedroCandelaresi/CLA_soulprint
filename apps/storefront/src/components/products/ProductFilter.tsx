'use client';

import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import { IconCategory, IconX } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import TooltipButton from '@/components/ui/TooltipButton';

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
        <Box p={{ xs: 2.25, md: 2.75 }}>
            <Box px={1} mb={2.25}>
                <Typography variant="h6" fontWeight={700}>
                    Filtrar colección
                </Typography>
            </Box>

            <List disablePadding sx={{ display: 'grid', gap: 0.75 }}>
                <Typography
                    variant="overline"
                    fontWeight={700}
                    px={1}
                    mb={1}
                    sx={{ color: 'secondary.dark' }}
                >
                    Categorías
                </Typography>
                {collections.map((collection) => (
                    <ListItemButton
                        key={collection.id}
                        selected={activeCollection === collection.slug}
                        onClick={() => handleCollectionClick(collection.slug)}
                        sx={{
                            borderRadius: 2,
                            border: '1px solid transparent',
                            px: 1.5,
                            py: 1.05,
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

            <Box px={1}>
                <TooltipButton
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    startIcon={<IconX size={18} />}
                    onClick={handleReset}
                    disabled={!activeCollection}
                    tooltip="Quitar el filtro de categoría activo"
                    sx={{ borderRadius: 2 }}
                >
                    Limpiar Filtros
                </TooltipButton>
            </Box>
        </Box>
    );
};

export default ProductFilter;
