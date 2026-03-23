'use client';

import { Container, Typography, Box, Grid, Button, Stack } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { IconHeartHandshake } from '@tabler/icons-react';

export default function JoyeriaContent() {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            {/* Hero Section */}
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography variant="overline" color="primary" fontWeight="bold" letterSpacing={2}>
                    CONEXIÓN ÚNICA
                </Typography>
                <Typography variant="h2" fontWeight="700" sx={{ mt: 1, mb: 3 }}>
                    Lleva a tu mejor amigo siempre cerca del corazón
                </Typography>
                <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}>
                    Sabemos que no es &quot;solo un perro&quot;. Es tu familia, tu compañero de aventuras y tu confidente silencioso.
                    En CLA creamos joyas que celebran ese vínculo inquebrantable.
                </Typography>
            </Box>

            {/* Feature Section */}
            <Grid container spacing={6} alignItems="center" sx={{ mb: 10 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ position: 'relative', height: '400px', borderRadius: 4, overflow: 'hidden', bgcolor: 'grey.100' }}>
                        {/* Placeholder for emotive image */}
                        <Image
                            src="/images/frontend-pages/homepage/joyeria_personalizada.png"
                            alt="Joyería Personalizada"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconHeartHandshake size={32} color="#5D87FF" />
                            <Typography variant="h4" fontWeight="600">El Combo Perfecto</Typography>
                        </Box>
                        <Typography variant="body1" fontSize="1.1rem" color="text.secondary">
                            Imagina llevar un colgante con el rostro de tu peludo grabado con precisión artesanal, mientras él luce una medalla a juego con tu rostro.
                            Es nuestra forma de decir &quot;estamos juntos en esto&quot;, una conexión simbólica que trasciende las palabras.
                        </Typography>
                        <Typography variant="body1" fontSize="1.1rem" color="text.secondary">
                            Cada pieza es pulida a mano y tratada para resistir las aventuras de tu mascota y acompañarte en tu día a día con elegancia.
                        </Typography>
                        <Button variant="contained" size="large" component={Link} href="/productos" sx={{ alignSelf: 'start', px: 4 }}>
                            Ver Colección
                        </Button>
                    </Stack>
                </Grid>
            </Grid>

            {/* Quote Section */}
            <Box sx={{ bgcolor: 'primary.light', p: 6, borderRadius: 4, textAlign: 'center' }}>
                <Typography variant="h4" fontStyle="italic" color="primary.dark">
                    &quot;Porque el amor verdadero deja huella... y ahora también se puede llevar puesta.&quot;
                </Typography>
            </Box>
        </Container>
    );
}
