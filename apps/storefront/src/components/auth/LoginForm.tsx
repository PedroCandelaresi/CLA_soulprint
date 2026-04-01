'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { login, resendVerificationEmail } from '@/lib/auth/client';
import { useCustomer } from './CustomerProvider';
import { useCart } from '@/components/cart/CartProvider';

function sanitizeReturnTo(value: string | null): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/auth/account';
    }
    return value;
}

interface LoginFormProps {
    nextParam?: string | null;
    oauthError?: string | null;
}

export default function LoginForm({ nextParam, oauthError }: LoginFormProps) {
    const { customer, isLoading, refreshCustomer } = useCustomer();
    const { refreshCart } = useCart();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationRequired, setVerificationRequired] = useState(false);
    const [resendSent, setResendSent] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const returnTo = sanitizeReturnTo(nextParam || null);

    useEffect(() => {
        if (!isLoading && customer && typeof window !== 'undefined') {
            window.location.href = returnTo;
        }
    }, [customer, isLoading, returnTo]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const response = await login({
            email,
            password,
            rememberMe: true,
        });

        if (!response.success) {
            setError(response.error || 'No se pudo iniciar sesión.');
            setVerificationRequired(response.verificationRequired === true);
            setIsSubmitting(false);
            return;
        }

        await Promise.all([
            refreshCustomer(),
            refreshCart(),
        ]);

        if (typeof window !== 'undefined') {
            window.location.href = returnTo;
        }
    }

    async function handleResend() {
        setIsResending(true);
        await resendVerificationEmail(email);
        setIsResending(false);
        setResendSent(true);
    }

    return (
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
            {oauthError && (
                <Alert severity="error">
                    {oauthError}
                </Alert>
            )}

            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            {verificationRequired && !resendSent && (
                <Alert
                    severity="warning"
                    action={
                        <Button color="inherit" size="small" disabled={isResending} onClick={() => void handleResend()}>
                            {isResending ? 'Enviando...' : 'Reenviar'}
                        </Button>
                    }
                >
                    ¿No recibiste el email de verificación? Podemos reenviártelo.
                </Alert>
            )}
            {verificationRequired && resendSent && (
                <Alert severity="success">
                    Te reenviamos el email. Revisá también la carpeta de spam.
                </Alert>
            )}

            <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />

            <TextField
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
            />

            <Typography variant="body2" textAlign="right">
                <Link
                    href="/password-reset"
                    prefetch={false}
                    style={{ color: 'var(--cla-brand-green)', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </Typography>

            <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LoginOutlinedIcon />}
            >
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>

            <Box
                sx={{
                    display: 'grid',
                    gap: 1.5,
                }}
            >
                <Box
                    aria-hidden
                    sx={{
                        width: '100%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.14), transparent)',
                    }}
                />
                <Button
                    component={Link}
                    href={`/auth/google?next=${encodeURIComponent(returnTo)}`}
                    prefetch={false}
                    variant="outlined"
                    size="large"
                    startIcon={<GoogleIcon />}
                >
                    Continuar con Google
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                Para pagar necesitás una cuenta activa. Si todavía no verificaste tu email, abrí ese link primero y después volvés al carrito.
            </Typography>
        </Stack>
    );
}
