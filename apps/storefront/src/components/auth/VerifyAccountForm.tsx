'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { verifyAccount, resendVerificationEmail } from '@/lib/auth/client';
import { useCustomer } from './CustomerProvider';
import { useCart } from '@/components/cart/CartProvider';

function sanitizeReturnTo(value: string | null): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/carrito';
    }
    return value;
}

interface VerifyAccountFormProps {
    token?: string | null;
    nextParam?: string | null;
}

export default function VerifyAccountForm({ token, nextParam }: VerifyAccountFormProps) {
    const { refreshCustomer } = useCustomer();
    const { refreshCart } = useCart();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [resendEmail, setResendEmail] = useState('');
    const [resendSent, setResendSent] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const returnTo = useMemo(() => sanitizeReturnTo(nextParam || null), [nextParam]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setMessage(null);

        if (!token) {
            setError('Falta el token de verificación. Abrí el link que te enviamos por email.');
            return;
        }
        if (password.length < 8) {
            setError('La contraseña tiene que tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await verifyAccount({ token, password });
            if (!response.success) {
                setError(response.error || 'No se pudo verificar la cuenta.');
                return;
            }

            setMessage(response.message || 'Cuenta verificada. Te estamos llevando de nuevo al carrito.');
            await Promise.all([
                refreshCustomer(),
                refreshCart(),
            ]);

            if (typeof window !== 'undefined') {
                window.location.href = returnTo;
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResend() {
        if (!resendEmail) return;
        setIsResending(true);
        await resendVerificationEmail(resendEmail);
        setIsResending(false);
        setResendSent(true);
    }

    if (!token) {
        return (
            <Stack spacing={2.5}>
                <Alert severity="error">
                    El link de verificación no es válido o está incompleto. Revisá el email que te enviamos y abrí el enlace completo.
                </Alert>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Si necesitás generar una cuenta nueva, volvé al registro y repetí el proceso.
                </Typography>
                {!resendSent && (
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                            ¿Querés que te reenviemos el email?
                        </Typography>
                        <TextField
                            label="Tu email"
                            type="email"
                            size="small"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={isResending || !resendEmail}
                            onClick={() => void handleResend()}
                        >
                            {isResending ? 'Enviando...' : 'Reenviar email de verificación'}
                        </Button>
                    </Stack>
                )}
                {resendSent && (
                    <Alert severity="success">
                        Te reenviamos el email. Revisá también la carpeta de spam.
                    </Alert>
                )}
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

            {(error?.includes('expiró') || error?.includes('inválido')) && !resendSent && (
                <Stack spacing={1.5} sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                        ¿El link expiró? Pedí uno nuevo:
                    </Typography>
                    <TextField
                        label="Tu email"
                        type="email"
                        size="small"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={isResending || !resendEmail}
                        onClick={() => void handleResend()}
                    >
                        {isResending ? 'Enviando...' : 'Reenviar email de verificación'}
                    </Button>
                </Stack>
            )}
            {(error?.includes('expiró') || error?.includes('inválido')) && resendSent && (
                <Alert severity="success">
                    Te reenviamos el email. Revisá también la carpeta de spam.
                </Alert>
            )}

            {message && (
                <Alert severity="success">
                    {message}
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
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <VerifiedUserOutlinedIcon />}
            >
                {isSubmitting ? 'Verificando cuenta...' : 'Activar cuenta'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                Cuando termines, quedás autenticado y volvés al carrito para finalizar la compra.
            </Typography>
        </Stack>
    );
}
