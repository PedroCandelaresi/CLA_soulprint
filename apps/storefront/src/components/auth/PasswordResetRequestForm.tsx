'use client';

import { useState } from 'react';
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { requestPasswordReset } from '@/lib/auth/client';

export default function PasswordResetRequestForm() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const response = await requestPasswordReset(email.trim());
        setIsSubmitting(false);

        if (!response.success) {
            setError(response.error || 'No se pudo procesar la solicitud.');
            return;
        }

        setSent(true);
    }

    if (sent) {
        return (
            <Stack spacing={2.5}>
                <Alert severity="success">
                    Si ese email está registrado, recibirás el link para restablecer tu contraseña en minutos. Revisá también la carpeta de spam.
                </Alert>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    El link es válido por un tiempo limitado. Si no lo usás a tiempo, podés pedir uno nuevo.
                </Typography>
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
                label="Email de tu cuenta"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />

            <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <MailOutlineIcon />}
            >
                {isSubmitting ? 'Enviando...' : 'Enviar link de recuperación'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                Ingresá el email que usaste al registrarte. Te vamos a mandar un link para definir una nueva contraseña.
            </Typography>
        </Stack>
    );
}
