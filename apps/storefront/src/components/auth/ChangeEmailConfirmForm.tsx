'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import { confirmEmailChange } from '@/lib/auth/client';

interface ChangeEmailConfirmFormProps {
    token?: string | null;
}

export default function ChangeEmailConfirmForm({ token }: ChangeEmailConfirmFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!token) {
            setError('Falta el token para confirmar el cambio de email.');
            return;
        }

        setIsSubmitting(true);
        const response = await confirmEmailChange({ token });
        setIsSubmitting(false);

        if (!response.success) {
            setError(response.error || 'No se pudo confirmar el cambio de email.');
            return;
        }

        setDone(true);
    }

    if (!token) {
        return (
            <Stack spacing={2.5}>
                <Alert severity="error">
                    El enlace para cambiar el email no es válido o está incompleto.
                </Alert>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Ingresá a tu cuenta y pedí un nuevo enlace desde el dashboard.
                </Typography>
            </Stack>
        );
    }

    if (done) {
        return (
            <Stack spacing={2.5}>
                <Alert severity="success">
                    Tu email quedó actualizado correctamente.
                </Alert>
                <Button
                    component={Link}
                    href="/auth/account"
                    prefetch={false}
                    variant="contained"
                    size="large"
                >
                    Volver a mi cuenta
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

            <Alert severity="info">
                Para completar el cambio de email, confirmá esta acción desde la misma sesión donde pediste el enlace.
            </Alert>

            <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <AlternateEmailOutlinedIcon />}
            >
                {isSubmitting ? 'Confirmando...' : 'Confirmar cambio de email'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                Si el enlace expiró o abriste otro navegador, iniciá sesión y pedí una nueva confirmación desde tu cuenta.
            </Typography>
        </Stack>
    );
}
