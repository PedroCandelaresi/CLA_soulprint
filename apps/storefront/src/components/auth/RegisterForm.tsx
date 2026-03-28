'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { register } from '@/lib/auth/client';
import { useCustomer } from './CustomerProvider';
import { useCart } from '@/components/cart/CartProvider';

function sanitizeReturnTo(value: string | null): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/auth/account';
    }
    return value;
}

interface RegisterFormProps {
    nextParam?: string | null;
}

export default function RegisterForm({ nextParam }: RegisterFormProps) {
    const router = useRouter();
    const { customer, isLoading, refreshCustomer } = useCustomer();
    const { refreshCart } = useCart();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

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
        setMessage(null);

        const response = await register({
            email,
            password,
            firstName,
            lastName,
        });

        if (!response.success) {
            setError(response.error || 'No se pudo crear la cuenta.');
            setIsSubmitting(false);
            return;
        }

        if (response.verificationRequired) {
            setMessage(response.message || 'Revisá tu email para verificar la cuenta y después iniciá sesión.');
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
            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            {message && (
                <Alert severity="success">
                    {message}
                </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                    label="Nombre"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                />
                <TextField
                    label="Apellido"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                />
            </Stack>

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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                helperText="Usá una contraseña que recuerdes; después vas a poder seguir tus pedidos desde el dashboard."
            />

            <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <PersonAddAltOutlinedIcon />}
            >
                {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                El checkout como invitado sigue disponible. Esta cuenta suma historial, tracking y personalización centralizados.
            </Typography>
        </Stack>
    );
}
