'use client';

import { Suspense, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useStorefront } from '@/components/providers/StorefrontProvider';

type FeedbackState = {
    severity: 'success' | 'error' | 'info';
    message: string;
};

function PasswordResetFallback() {
    return (
        <Box
            sx={{
                minHeight: '70vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                py: 4,
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
                >
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Typography variant="h4" fontWeight={700}>
                            Recuperar contraseña
                        </Typography>
                        <CircularProgress />
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

function PasswordResetPageContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const { authLoading, resetPassword } = useStorefront();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [feedback, setFeedback] = useState<FeedbackState | null>(
        token
            ? {
                  severity: 'info',
                  message: 'Definí tu nueva contraseña para recuperar el acceso a tu cuenta.',
              }
            : {
                  severity: 'error',
                  message: 'No encontramos un token válido de recupero en este enlace.',
              },
    );

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!token) {
            setFeedback({
                severity: 'error',
                message: 'No encontramos un token válido para restablecer la contraseña.',
            });
            return;
        }

        if (!password || password.length < 8) {
            setFeedback({
                severity: 'error',
                message: 'La nueva contraseña debe tener al menos 8 caracteres.',
            });
            return;
        }

        if (password !== confirmPassword) {
            setFeedback({
                severity: 'error',
                message: 'Las contraseñas no coinciden.',
            });
            return;
        }

        const result = await resetPassword({ token, password });
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success
                    ? 'La contraseña se actualizó correctamente.'
                    : 'No se pudo actualizar la contraseña.'),
        });
    };

    return (
        <Box
            sx={{
                minHeight: '70vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                py: 4,
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
                >
                    <Stack spacing={3}>
                        <Stack spacing={1} textAlign="center">
                            <Typography variant="h4" fontWeight={700}>
                                Recuperar contraseña
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Elegí una nueva contraseña para volver a entrar y administrar tu cuenta con normalidad.
                            </Typography>
                        </Stack>

                        {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2.25}>
                                <TextField
                                    label="Nueva contraseña"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    fullWidth
                                    required
                                    disabled={!token}
                                />
                                <TextField
                                    label="Confirmar nueva contraseña"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    fullWidth
                                    required
                                    disabled={!token}
                                />
                                <Button type="submit" variant="contained" size="large" disabled={authLoading || !token}>
                                    Restablecer contraseña
                                </Button>
                            </Stack>
                        </Box>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button component={Link} href="/auth/login" variant="outlined" fullWidth>
                                Ir al acceso
                            </Button>
                            <Button component={Link} href="/" variant="text" fullWidth>
                                Volver al inicio
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

export default function PasswordResetPage() {
    return (
        <Suspense fallback={<PasswordResetFallback />}>
            <PasswordResetPageContent />
        </Suspense>
    );
}
