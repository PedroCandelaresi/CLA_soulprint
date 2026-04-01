'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { resetPassword } from '@/lib/auth/client';

interface PasswordResetConfirmFormProps {
    token: string;
}

export default function PasswordResetConfirmForm({ token }: PasswordResetConfirmFormProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('La contraseña tiene que tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        const response = await resetPassword({ token, password });
        setIsSubmitting(false);

        if (!response.success) {
            setError(response.error || 'No se pudo restablecer la contraseña.');
            return;
        }

        setDone(true);
    }

    if (done) {
        return (
            <Stack spacing={2.5}>
                <Alert severity="success">
                    Tu contraseña fue actualizada. Ya podés ingresar con tus nuevos datos.
                </Alert>
                <Button
                    component={Link}
                    href="/auth/login"
                    prefetch={false}
                    variant="contained"
                    size="large"
                >
                    Ir al login
                </Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            <TextField
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText="Usá al menos 8 caracteres."
                required
            />

            <TextField
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
            />

            <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockResetOutlinedIcon />}
            >
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                Cuando guardes, tu contraseña anterior quedará desactivada.
            </Typography>
        </Stack>
    );
}
