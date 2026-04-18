'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { confirmCustomerEmailChange } from '@/lib/vendure/account';
import { useStorefront } from '@/components/providers/StorefrontProvider';

type ConfirmationStatus = 'idle' | 'loading' | 'success' | 'error';

function ChangeEmailAddressFallback() {
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
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Typography variant="h4" fontWeight={700}>
                            Confirmación de email
                        </Typography>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            Cargando confirmación...
                        </Typography>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

function ChangeEmailAddressContent() {
    const searchParams = useSearchParams();
    const { customer, isAuthenticated, refreshState } = useStorefront();
    const token = searchParams.get('token') || '';
    const autoAttemptedRef = useRef(false);
    const [status, setStatus] = useState<ConfirmationStatus>(token ? 'idle' : 'error');
    const [message, setMessage] = useState(
        token ? 'Validando el cambio de email...' : 'No encontramos un token válido en el enlace.',
    );

    useEffect(() => {
        if (!token || autoAttemptedRef.current) {
            return;
        }

        autoAttemptedRef.current = true;

        const timeoutId = window.setTimeout(async () => {
            setStatus('loading');
            const result = await confirmCustomerEmailChange(token);

            if (result.success) {
                await refreshState();
                setStatus('success');
                setMessage(result.message || 'Tu email quedó actualizado.');
                return;
            }

            setStatus('error');
            setMessage(result.message || 'No pudimos confirmar el cambio de email.');
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [refreshState, token]);

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
                                Confirmación de email
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Estamos validando el enlace para terminar el cambio del email de acceso.
                            </Typography>
                        </Stack>

                        {status === 'loading' ? (
                            <Stack alignItems="center" spacing={2} py={2}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary">
                                    {message}
                                </Typography>
                            </Stack>
                        ) : (
                            <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>
                        )}

                        {status === 'success' && customer?.emailAddress && (
                            <Typography variant="body2" color="text.secondary">
                                Email activo en la cuenta: <strong>{customer.emailAddress}</strong>
                            </Typography>
                        )}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            {status === 'success' && isAuthenticated ? (
                                <>
                                    <Button component={Link} href="/mi-cuenta/perfil" variant="contained" fullWidth>
                                        Volver a mi perfil
                                    </Button>
                                    <Button component={Link} href="/mi-cuenta/seguridad" variant="outlined" fullWidth>
                                        Ir a seguridad
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button component={Link} href="/auth/login" variant="contained" fullWidth>
                                        Ir al acceso
                                    </Button>
                                    <Button component={Link} href="/" variant="outlined" fullWidth>
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

export default function ChangeEmailAddressPage() {
    return (
        <Suspense fallback={<ChangeEmailAddressFallback />}>
            <ChangeEmailAddressContent />
        </Suspense>
    );
}
