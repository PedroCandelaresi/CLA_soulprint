'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    Alert,
    Box,
    Button,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import { useCustomerAccount } from './CustomerAccountProvider';
import { AccountEmptyState, AccountErrorState, AccountSectionCard } from './AccountShared';

type FeedbackState = {
    severity: 'success' | 'error' | 'info';
    message: string;
};

const initialPasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
};

export default function AccountSecurity() {
    const router = useRouter();
    const { logout } = useStorefront();
    const { accountError, changePassword, customer } = useCustomerAccount();
    const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    if (accountError) {
        return <AccountErrorState message={accountError} />;
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="No pudimos cargar la seguridad de tu cuenta"
                description="Volvé a iniciar sesión para administrar tus credenciales."
            />
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setFeedback({
                severity: 'error',
                message: 'Completá los tres campos para actualizar tu contraseña.',
            });
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setFeedback({
                severity: 'error',
                message: 'La nueva contraseña debe tener al menos 8 caracteres.',
            });
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setFeedback({
                severity: 'error',
                message: 'La confirmación no coincide con la nueva contraseña.',
            });
            return;
        }

        if (passwordForm.currentPassword === passwordForm.newPassword) {
            setFeedback({
                severity: 'error',
                message: 'Elegí una contraseña nueva distinta de la actual.',
            });
            return;
        }

        setLoading(true);
        const result = await changePassword({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
        });
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Tu contraseña ya fue actualizada.' : 'No pudimos actualizar tu contraseña.'),
        });
        if (result.success) {
            setPasswordForm(initialPasswordForm);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Seguridad
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Protegé tu acceso con un flujo claro para contraseña y sesión.
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', xl: '1.1fr 0.9fr' },
                    alignItems: 'start',
                }}
            >
                <Box component="form" onSubmit={handleSubmit}>
                    <AccountSectionCard>
                        <Stack spacing={2.5}>
                            <Stack spacing={0.5}>
                                <Typography variant="h6" fontWeight={700}>
                                    Cambiar contraseña
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Usá una contraseña nueva, segura y fácil de recordar para vos.
                                </Typography>
                            </Stack>

                            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                            <TextField
                                label="Contraseña actual"
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(event) =>
                                    setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                                }
                                fullWidth
                            />
                            <TextField
                                label="Nueva contraseña"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(event) =>
                                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                                }
                                helperText="Recomendación: mínimo 8 caracteres."
                                fullWidth
                            />
                            <TextField
                                label="Confirmar nueva contraseña"
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(event) =>
                                    setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                                }
                                fullWidth
                            />

                            <Button type="submit" variant="contained" disabled={loading}>
                                Guardar nueva contraseña
                            </Button>
                        </Stack>
                    </AccountSectionCard>
                </Box>

                <Stack spacing={2}>
                    <AccountSectionCard>
                        <Stack spacing={1.25}>
                            <Typography variant="h6" fontWeight={700}>
                                Sesión actual
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                                {customer.emailAddress}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Si compartís dispositivo o terminaste tu compra, podés cerrar sesión desde acá.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<LogoutOutlinedIcon fontSize="small" />}
                                onClick={handleLogout}
                            >
                                Cerrar sesión
                            </Button>
                        </Stack>
                    </AccountSectionCard>

                    <AccountSectionCard>
                        <Stack spacing={1}>
                            <Typography variant="h6" fontWeight={700}>
                                Buenas prácticas
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Evitá reutilizar contraseñas de otros servicios y actualizala apenas sospeches un
                                acceso no autorizado.
                            </Typography>
                        </Stack>
                    </AccountSectionCard>
                </Stack>
            </Box>
        </Stack>
    );
}
