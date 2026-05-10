'use client';

import { Container, Typography, Box, Card, CardContent, Avatar, Chip, Stack } from '@mui/material';
import { IconClick, IconCreditCard, IconPhotoUp, IconShoppingCart, IconTruckDelivery } from '@tabler/icons-react';
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
        icon: <IconPhotoUp size={40} />,
        title: '4. Cargá tu Foto',
        description: 'Subí el archivo para personalizar tu pieza'
    },
    {
        icon: <IconTruckDelivery size={40} />,
        title: '5. Recibí en Casa',
        description: 'Enviamos tu pedido a donde estés'
    }
];

export default function ComoComprarContent() {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
                <Stack direction="row" justifyContent="center" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
                    <Chip label="Guía de compra" color="secondary" variant="outlined" />
                    <Chip label="Simple y clara" color="primary" variant="outlined" />
                </Stack>
                <Typography variant="h2" fontWeight="700" sx={{ mt: 1 }}>
                    Tu compra en 5 pasos
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
                    Un recorrido claro, elegante y sin fricción para comprar en CLA Soulprint.
                </Typography>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: 'repeat(5, minmax(0, 1fr))',
                    },
                    gap: { xs: 2.5, md: 3 },
                    mb: { xs: 6, md: 8 },
                }}
            >
                {steps.map((step, index) => (
                    <Card
                        key={index}
                        variant="outlined"
                        sx={{
                            height: '100%',
                            borderColor: 'rgba(0,72,37,0.14)',
                            bgcolor: 'rgba(255,251,244,0.9)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: 2,
                            boxShadow: '0 16px 34px rgba(6,38,22,0.08)',
                        }}
                    >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                            <Avatar
                                sx={{
                                    bgcolor: 'rgba(255,250,242,0.96)',
                                    color: 'primary.main',
                                    border: '1px solid rgba(199,164,107,0.28)',
                                    width: 72,
                                    height: 72,
                                    mx: 'auto',
                                    mb: 3,
                                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.68)',
                                }}
                            >
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
                ))}
            </Box>

            <Box textAlign="center">
                <TooltipButton
                    variant="contained"
                    size="large"
                    href="/productos"
                    tooltip="Ir a la tienda"
                    sx={{ px: 5, py: 1.4, fontSize: '1rem', borderRadius: 2 }}
                >
                    Ver productos
                </TooltipButton>
            </Box>
        </Container>
    );
}
