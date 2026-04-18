'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { useStorefront } from '@/components/providers/StorefrontProvider';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

function VerifyPageFallback() {
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
                            Verificación de cuenta
                        </Typography>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            Cargando verificación...
                        </Typography>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

function VerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { authLoading, verifyCustomer } = useStorefront();
    const token = searchParams.get('token') || '';
    const [status, setStatus] = useState<VerificationStatus>(token ? 'idle' : 'error');
    const [message, setMessage] = useState(
        token ? 'Validando tu cuenta...' : 'No encontramos un token de verificación válido en el enlace.',
    );
    const [password, setPassword] = useState('');
    const autoAttemptedRef = useRef(false);

    const shouldAskPassword = useMemo(() => status === 'error', [status]);

    const handleVerify = useCallback(
        async (passwordOverride?: string) => {
            if (!token) {
                setStatus('error');
                setMessage('No encontramos un token de verificación válido.');
                return;
            }

            setStatus('loading');
            const result = await verifyCustomer({
                token,
                password: passwordOverride || undefined,
            });

            if (result.success) {
                setStatus('success');
                setMessage(result.message || 'Cuenta verificada correctamente.');
                return;
            }

            setStatus('error');
            setMessage(result.message || 'No se pudo verificar la cuenta.');
        },
        [token, verifyCustomer],
    );

    useEffect(() => {
        if (!token || autoAttemptedRef.current) {
            return;
        }

        autoAttemptedRef.current = true;

        const timeoutId = window.setTimeout(() => {
            void handleVerify();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [handleVerify, token]);

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
                <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={3}>
                        <Stack spacing={1} textAlign="center">
                            <Typography variant="h4" fontWeight={700}>
                                Verificación de cuenta
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Confirmamos tu email para activar el acceso y, si hace falta, definir tu contraseña por primera vez.
                            </Typography>
                        </Stack>

                        {(status === 'loading' || authLoading) && (
                            <Stack alignItems="center" spacing={2} py={2}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary">
                                    {message}
                                </Typography>
                            </Stack>
                        )}

                        {status !== 'loading' && (
                            <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>
                        )}

                        {shouldAskPassword && token && (
                            <Stack spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                    Este enlace también puede servir para terminar de crear tu acceso. Definí una
                                    contraseña y volvé a intentar para activar la cuenta por completo.
                                </Typography>
                                <TextField
                                    label="Elegí tu contraseña"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    fullWidth
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => void handleVerify(password)}
                                    disabled={authLoading}
                                >
                                    Activar cuenta y guardar contraseña
                                </Button>
                            </Stack>
                        )}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            {status === 'success' ? (
                                <>
                                    <Button component={Link} href="/carrito" variant="contained" fullWidth>
                                        Ir al carrito
                                    </Button>
                                    <Button component={Link} href="/" variant="outlined" fullWidth>
                                        Volver al inicio
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button component={Link} href="/auth/login" variant="contained" fullWidth>
                                        Ir al acceso
                                    </Button>
                                    <Button variant="outlined" fullWidth onClick={() => router.push('/')}>
                                        Volver al inicio
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<VerifyPageFallback />}>
            <VerifyPageContent />
        </Suspense>
    );
}
