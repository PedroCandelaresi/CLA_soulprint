'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { login } from '@/lib/auth/client';
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
    const router = useRouter();
    const { customer, isLoading, refreshCustomer } = useCustomer();
    const { refreshCart } = useCart();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const returnTo = sanitizeReturnTo(nextParam || null);

    useEffect(() => {
        if (!isLoading && customer) {
            router.replace(returnTo);
        }
    }, [customer, isLoading, returnTo, router]);

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
            setIsSubmitting(false);
            return;
        }

        await Promise.all([
            refreshCustomer(),
            refreshCart(),
        ]);

        router.replace(returnTo);
        router.refresh();
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
                    variant="outlined"
                    size="large"
                    startIcon={<GoogleIcon />}
                >
                    Continuar con Google
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                También podés seguir comprando como invitado y crear tu cuenta más tarde.
            </Typography>
        </Stack>
    );
}
