'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function VerificacionPendientePage() {
    return (
        <Suspense>
            <VerificacionPendienteContent />
        </Suspense>
    );
}

function VerificacionPendienteContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    return (
        <Box
            sx={{
                minHeight: '70vh',
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #fafafa 100%)',
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, md: 6 },
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                    }}
                >
                    <Stack spacing={3} alignItems="center">
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: 'primary.50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <MarkEmailUnreadOutlinedIcon
                                sx={{ fontSize: 40, color: 'primary.main' }}
                            />
                        </Box>

                        <Stack spacing={1}>
                            <Typography variant="h4" fontWeight={800}>
                                Revisá tu correo
                            </Typography>
                            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                Te enviamos un mail a{' '}
                                {email && (
                                    <Typography
                                        component="span"
                                        fontWeight={700}
                                        color="text.primary"
                                    >
                                        {email}
                                    </Typography>
                                )}
                                {!email && 'tu casilla de correo'}
                                . Hacé clic en el enlace que te mandamos para activar tu cuenta
                                y elegir tu contraseña.
                            </Typography>
                        </Stack>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                bgcolor: 'success.50',
                                borderColor: 'success.200',
                                width: '100%',
                            }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <CheckCircleOutlineIcon
                                    sx={{ color: 'success.main', mt: 0.3, flexShrink: 0 }}
                                />
                                <Typography variant="body2" color="success.dark">
                                    Tu carrito está guardado. Una vez que activés tu cuenta e
                                    ingreses, vas a poder retomar la compra exactamente donde la
                                    dejaste.
                                </Typography>
                            </Stack>
                        </Paper>

                        <Stack spacing={1.5} width="100%">
                            <Button
                                component={Link}
                                href={`/auth/login?redirect=${encodeURIComponent('/checkout')}&email=${encodeURIComponent(email)}&reason=checkout`}
                                variant="contained"
                                size="large"
                                fullWidth
                                sx={{ borderRadius: 2, py: 1.5 }}
                            >
                                Ya activé mi cuenta — Ingresar
                            </Button>
                            <Button
                                component={Link}
                                href="/checkout"
                                variant="text"
                                fullWidth
                            >
                                Volver al checkout
                            </Button>
                        </Stack>

                        <Typography variant="caption" color="text.disabled">
                            ¿No llegó el mail? Revisá la carpeta de spam. Si usaste una dirección
                            con error, volvé al checkout y corregila.
                        </Typography>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
