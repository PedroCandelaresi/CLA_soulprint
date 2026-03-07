'use client';

import { Container, Box, Typography, TextField, Button, Paper, Stack } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', { email, password });
        // TODO: Implement Vendure Auth
        alert('El inicio de sesión de clientes estará disponible pronto. Por favor, usa el panel de administración para gestionar la tienda.');
    };

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
                        Bienvenido de nuevo
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Ingresa a tu cuenta para ver tus pedidos
                    </Typography>

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <TextField
                                label="Correo Electrónico"
                                type="email"
                                fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <TextField
                                label="Contraseña"
                                type="password"
                                fullWidth
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                fullWidth
                                sx={{ py: 1.5, fontSize: '1.1rem' }}
                            >
                                Ingresar
                            </Button>
                        </Stack>
                    </form>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            ¿No tienes cuenta? <Link href="/auth/register" style={{ color: '#004825', fontWeight: 'bold' }}>Regístrate</Link>
                        </Typography>
                        <Box mt={2}>
                            <Typography variant="caption" color="text.disabled">
                                (Funcionalidad Clientes en desarrollo)
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
