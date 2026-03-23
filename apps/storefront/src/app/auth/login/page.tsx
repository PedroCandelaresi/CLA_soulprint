'use client';

import { Container, Box, Typography, Paper, Stack } from '@mui/material';
import Image from 'next/image';

export default function LoginPage() {
    return (
        <Box
            sx={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                py: 4
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 6 },
                        borderRadius: 4,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                        <Image src="/images/logos/CLA.svg" alt="CLA Logo" width={180} height={60} style={{ objectFit: 'contain' }} />
                    </Box>

                    <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                        Acceso de clientes no disponible
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        La autenticación de clientes todavía no está habilitada en esta tienda.
                    </Typography>

                    <Stack spacing={2} sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            El historial de pedidos, el acceso con email y el registro de clientes siguen en desarrollo.
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            Cuando estas funciones estén disponibles, se publicarán nuevamente desde el encabezado principal.
                        </Typography>
                    </Stack>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Por ahora, esta tienda funciona como catálogo público.
                        </Typography>
                        <Box mt={2}>
                            <Typography variant="caption" color="text.disabled">
                                (Autenticación y compra online en desarrollo)
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
