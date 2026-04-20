'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Avatar, Chip, Stack } from '@mui/material';
import { IconClick, IconCreditCard, IconShoppingCart, IconTruckDelivery } from '@tabler/icons-react';
import Link from 'next/link';
import TooltipButton from '@/components/ui/TooltipButton';

const steps = [
    {
        icon: <IconClick size={40} />,
        title: '1. Elegí tu Producto',
        description: 'Navegá por el catálogo y encontrá lo que buscás'
    },
    {
        icon: <IconShoppingCart size={40} />,
        title: '2. Agregá al Carrito',
        description: 'Seleccioná las opciones y cantidades'
    },
    {
        icon: <IconCreditCard size={40} />,
        title: '3. Completá tu Pedido',
        description: 'Ingresá tus datos de envío y pago'
    },
    {
        icon: <IconTruckDelivery size={40} />,
        title: '4. Recibí en Casa',
        description: 'Enviamos tu pedido a donde estés'
    }
];

export default function ComoComprarContent() {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Stack direction="row" justifyContent="center" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
                    <Chip label="Guía de compra" color="secondary" variant="outlined" />
                    <Chip label="Simple y clara" color="primary" variant="outlined" />
                </Stack>
                <Typography variant="h2" fontWeight="700" sx={{ mt: 1 }}>
                    Tu compra en 4 pasos
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
                    Un recorrido claro, elegante y sin fricción para comprar en CLA Soulprint.
                </Typography>
            </Box>

            <Grid container spacing={4} sx={{ mb: 8 }}>
                {steps.map((step, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <Card
                            variant="outlined"
                            sx={{
                                height: '100%',
                                borderColor: 'primary.light',
                                bgcolor: 'rgba(255,251,244,0.84)',
                                backdropFilter: 'blur(12px)',
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 80, height: 80, mx: 'auto', mb: 3 }}>
                                    {step.icon}
                                </Avatar>
                                <Typography variant="h5" fontWeight="600" gutterBottom>
                                    {step.title}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {step.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box textAlign="center">
                <TooltipButton
                    variant="contained"
                    size="large"
                    href="/productos"
                    tooltip="Ir a la tienda"
                    sx={{ px: 6, py: 2, fontSize: '1.05rem' }}
                >
                    Ver productos
                </TooltipButton>
            </Box>
        </Container>
    );
}
