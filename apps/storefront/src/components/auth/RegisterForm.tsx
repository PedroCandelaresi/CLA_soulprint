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
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
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

        console.log('[RegisterForm] Submitting registration request', {
            email,
            hasFullName: Boolean(fullName.trim()),
            hasPhoneNumber: Boolean(phoneNumber.trim()),
            next: returnTo,
        });

        const response = await register({
            email,
            fullName,
            phoneNumber,
        });

        console.log('[RegisterForm] Registration response received', response);

        if (!response.success) {
            setError(response.error || 'No se pudo crear la cuenta.');
            setIsSubmitting(false);
            return;
        }

        if (response.verificationRequired) {
            setMessage(response.message || 'Revisá tu email para verificar la cuenta, definí tu contraseña y después volvés al carrito.');
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

            <TextField
                label="Nombre completo"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
            />

            <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />

            <TextField
                label="Teléfono"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                helperText="Lo usamos para identificar tu compra y contactarte si hace falta."
                required
            />

            <Alert severity="info">
                Después de crear la cuenta te vamos a enviar un email para activarla. En ese link definís tu contraseña y quedás listo para volver al carrito.
            </Alert>

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
                Necesitás una cuenta verificada para finalizar la compra. Si preferís, también podés entrar con Google desde la pantalla de login.
            </Typography>
        </Stack>
    );
}
