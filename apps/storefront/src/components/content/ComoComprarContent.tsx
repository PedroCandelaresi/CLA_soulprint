'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Avatar, Button } from '@mui/material';
import { IconPhoto, IconTruckDelivery, IconClick, IconMoodHeart } from '@tabler/icons-react';
import Link from 'next/link';

const steps = [
    {
        icon: <IconClick size={40} />,
        title: '1. Elegí tu Estilo',
        description: 'Navegá por nuestra tienda y seleccioná si preferís un collar, un dije o nuestro famoso "Combo Huella". Tenemos opciones en plata, oro y acero quirúrgico.'
    },
    {
        icon: <IconPhoto size={40} />,
        title: '2. Compartí tu Historia',
        description: 'Al finalizar la compra, nos pondremos en contacto para que nos envíes esa foto especial. ¡No te preocupes! Te ayudaremos a elegir la que mejor quede.'
    },
    {
        icon: <IconMoodHeart size={40} />,
        title: '3. Magia Artesanal',
        description: 'Nuestros orfebres se ponen manos a la obra. Grabamos con precisión cada rasgo, cada gesto, poniendo todo el cariño que tu mascota merece.'
    },
    {
        icon: <IconTruckDelivery size={40} />,
        title: '4. Recibí Amor',
        description: 'Enviamos tu joya en un packaging listo para regalar (o regalarte). Prepárate para emocionarte al abrir la cajita.'
    }
];

export default function ComoComprarContent() {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography variant="overline" color="primary" fontWeight="bold" letterSpacing={2}>
                    GUÍA DE COMPRA
                </Typography>
                <Typography variant="h2" fontWeight="700" sx={{ mt: 1 }}>
                    Tu pieza única en 4 pasos
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
                    Crear un recuerdo eterno es más fácil de lo que imaginas.
                </Typography>
            </Box>

            <Grid container spacing={4} sx={{ mb: 8 }}>
                {steps.map((step, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <Card variant="outlined" sx={{ height: '100%', borderColor: 'primary.light', bgcolor: 'transparent' }}>
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
                <Button variant="contained" size="large" component={Link} href="/productos" sx={{ px: 6, py: 2, fontSize: '1.2rem' }}>
                    ¡Quiero empezar ahora!
                </Button>
            </Box>
        </Container>
    );
}
