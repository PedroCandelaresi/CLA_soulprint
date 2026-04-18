'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useCustomerAccount } from './CustomerAccountProvider';
import { AccountEmptyState, AccountErrorState, AccountSectionCard } from './AccountShared';

type FeedbackState = {
    severity: 'success' | 'error' | 'info';
    message: string;
};

const initialProfileForm = {
    title: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
};

const initialEmailForm = {
    newEmailAddress: '',
    password: '',
};

export default function AccountProfile() {
    const { accountError, customer, requestEmailChange, updateProfile } = useCustomerAccount();
    const [profileForm, setProfileForm] = useState(initialProfileForm);
    const [emailForm, setEmailForm] = useState(initialEmailForm);
    const [profileLoading, setProfileLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(null);
    const [emailFeedback, setEmailFeedback] = useState<FeedbackState | null>(null);

    useEffect(() => {
        if (!customer) {
            return;
        }

        setProfileForm({
            title: customer.title || '',
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phoneNumber: customer.phoneNumber || '',
        });
    }, [customer]);

    if (accountError) {
        return <AccountErrorState message={accountError} />;
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="No pudimos cargar tu perfil"
                description="Volvé a iniciar sesión para recuperar tus datos personales."
            />
        );
    }

    const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProfileFeedback(null);

        if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
            setProfileFeedback({
                severity: 'error',
                message: 'Completá nombre y apellido para actualizar tu perfil.',
            });
            return;
        }

        setProfileLoading(true);
        const result = await updateProfile(profileForm);
        setProfileFeedback({
            severity: result.success ? 'success' : 'error',
            message: result.message || (result.success ? 'Perfil actualizado.' : 'No se pudo actualizar el perfil.'),
        });
        setProfileLoading(false);
    };

    const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setEmailFeedback(null);

        if (!emailForm.newEmailAddress.trim() || !emailForm.password) {
            setEmailFeedback({
                severity: 'error',
                message: 'Ingresá el nuevo email y tu contraseña actual para continuar.',
            });
            return;
        }

        if (emailForm.newEmailAddress.trim().toLowerCase() === customer.emailAddress.toLowerCase()) {
            setEmailFeedback({
                severity: 'error',
                message: 'El nuevo email debe ser distinto al email actual.',
            });
            return;
        }

        setEmailLoading(true);
        const result = await requestEmailChange({
            newEmailAddress: emailForm.newEmailAddress,
            password: emailForm.password,
        });
        setEmailFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Te enviamos el enlace de confirmación.' : 'No se pudo iniciar el cambio de email.'),
        });
        if (result.success) {
            setEmailForm(initialEmailForm);
        }
        setEmailLoading(false);
    };

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Datos personales
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Administrá tus datos de contacto y el email con el que accedés a tu cuenta.
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' },
                    alignItems: 'start',
                }}
            >
                <Box component="form" onSubmit={handleProfileSubmit}>
                    <AccountSectionCard>
                        <Stack spacing={2.5}>
                            <Stack spacing={0.5}>
                                <Typography variant="h6" fontWeight={700}>
                                    Datos de contacto
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Estos datos identifican tu cuenta y sirven como contacto principal.
                                </Typography>
                            </Stack>

                            {profileFeedback && (
                                <Alert severity={profileFeedback.severity}>{profileFeedback.message}</Alert>
                            )}

                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2,
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                                }}
                            >
                                <TextField
                                    label="Tratamiento"
                                    value={profileForm.title}
                                    onChange={(event) =>
                                        setProfileForm((prev) => ({ ...prev, title: event.target.value }))
                                    }
                                    placeholder="Ej. Sr., Sra. o Dr."
                                    fullWidth
                                />
                                <TextField
                                    label="Teléfono"
                                    value={profileForm.phoneNumber}
                                    onChange={(event) =>
                                        setProfileForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
                                    }
                                    placeholder="Tu número de contacto"
                                    fullWidth
                                />
                                <TextField
                                    label="Nombre"
                                    value={profileForm.firstName}
                                    onChange={(event) =>
                                        setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))
                                    }
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="Apellido"
                                    value={profileForm.lastName}
                                    onChange={(event) =>
                                        setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))
                                    }
                                    required
                                    fullWidth
                                />
                            </Box>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Las direcciones de envío y facturación se administran por separado para mantener la
                                    experiencia de compra ordenada.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                    <Button component={Link} href="/mi-cuenta/direcciones" variant="outlined">
                                        Ver direcciones
                                    </Button>
                                    <Button type="submit" variant="contained" disabled={profileLoading}>
                                        Guardar cambios
                                    </Button>
                                </Stack>
                            </Stack>
                        </Stack>
                    </AccountSectionCard>
                </Box>

                <Stack spacing={2}>
                    <AccountSectionCard>
                        <Stack spacing={1.25}>
                            <Typography variant="h6" fontWeight={700}>
                                Email actual de acceso
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                                {customer.emailAddress}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Este email es el que usás para iniciar sesión y recibir comunicaciones vinculadas a tu
                                cuenta.
                            </Typography>
                        </Stack>
                    </AccountSectionCard>

                    <Box component="form" onSubmit={handleEmailSubmit}>
                        <AccountSectionCard>
                            <Stack spacing={2.5}>
                                <Stack spacing={0.5}>
                                    <Typography variant="h6" fontWeight={700}>
                                        Cambiar email de acceso
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Por seguridad, te vamos a enviar un enlace de confirmación al nuevo email antes de
                                        completar el cambio.
                                    </Typography>
                                </Stack>

                                {emailFeedback && (
                                    <Alert severity={emailFeedback.severity}>{emailFeedback.message}</Alert>
                                )}

                                <TextField
                                    label="Nuevo email"
                                    type="email"
                                    value={emailForm.newEmailAddress}
                                    onChange={(event) =>
                                        setEmailForm((prev) => ({ ...prev, newEmailAddress: event.target.value }))
                                    }
                                    fullWidth
                                />
                                <TextField
                                    label="Contraseña actual"
                                    type="password"
                                    value={emailForm.password}
                                    onChange={(event) =>
                                        setEmailForm((prev) => ({ ...prev, password: event.target.value }))
                                    }
                                    helperText="La usamos para validar que el cambio lo estás solicitando vos."
                                    fullWidth
                                />

                                <Button type="submit" variant="contained" disabled={emailLoading}>
                                    Solicitar cambio de email
                                </Button>
                            </Stack>
                        </AccountSectionCard>
                    </Box>
                </Stack>
            </Box>
        </Stack>
    );
}
