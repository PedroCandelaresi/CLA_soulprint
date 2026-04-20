'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    Collapse,
    Container,
    Divider,
    FormControlLabel,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import { resolveRedirectTarget } from '@/lib/auth/redirects';
import BrandLogoImage from '@/components/branding/BrandLogoImage';
import TooltipButton from '@/components/ui/TooltipButton';

const REQUIRE_CUSTOMER_VERIFICATION =
    process.env.NEXT_PUBLIC_REQUIRE_CUSTOMER_VERIFICATION === 'true';

type FeedbackState = {
    severity: 'success' | 'error' | 'info';
    message: string;
};

const initialLoginForm = {
    emailAddress: '',
    password: '',
    rememberMe: false,
};

const initialRegisterForm = {
    firstName: '',
    lastName: '',
    emailAddress: '',
    password: '',
    confirmPassword: '',
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        authLoading,
        customer,
        initialized,
        isAuthenticated,
        login,
        logout,
        recoverCustomerAccess,
        register,
    } = useStorefront();
    const redirectTarget = useMemo(
        () => resolveRedirectTarget(searchParams.get('redirect')),
        [searchParams],
    );
    const authError = searchParams.get('authError');
    const checkoutEmail = searchParams.get('email') || '';
    const checkoutReason = searchParams.get('reason');
    const primaryAuthenticatedLabel = redirectTarget === '/mi-cuenta' ? 'Ir a mi cuenta' : 'Continuar';
    const authContextFeedback = useMemo<FeedbackState | null>(() => {
        if (checkoutReason === 'checkout') {
            return {
                severity: 'info',
                message:
                    'Este email ya tiene una cuenta. Ingresá para continuar con tu compra — tu carrito te estará esperando.',
            };
        }

        if (authError === 'session-unavailable') {
            return {
                severity: 'info',
                message:
                    'No pudimos validar tu sesión en este momento. Ingresá de nuevo para continuar con seguridad.',
            };
        }

        return null;
    }, [authError, checkoutReason]);
    const [tab, setTab] = useState(0);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [loginForm, setLoginForm] = useState(() => ({
        ...initialLoginForm,
        emailAddress: checkoutEmail || initialLoginForm.emailAddress,
    }));
    const [registerForm, setRegisterForm] = useState(initialRegisterForm);
    const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
    const [passwordRecoveryEmail, setPasswordRecoveryEmail] = useState('');

    const customerName = useMemo(() => {
        if (!customer) {
            return 'Cliente';
        }

        return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.emailAddress;
    }, [customer]);

    const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);

        if (!loginForm.emailAddress || !loginForm.password) {
            setFeedback({ severity: 'error', message: 'Completá email y contraseña para ingresar.' });
            return;
        }

        const result = await login(loginForm);
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message: result.message || (result.success ? 'Sesión iniciada.' : 'No se pudo iniciar sesión.'),
        });

        if (result.success) {
            router.push(redirectTarget);
        }
    };

    const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);

        if (
            !registerForm.firstName ||
            !registerForm.lastName ||
            !registerForm.emailAddress ||
            !registerForm.password
        ) {
            setFeedback({ severity: 'error', message: 'Completá todos los campos obligatorios para crear tu cuenta.' });
            return;
        }

        if (registerForm.password.length < 8) {
            setFeedback({ severity: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }

        if (registerForm.password !== registerForm.confirmPassword) {
            setFeedback({ severity: 'error', message: 'Las contraseñas no coinciden.' });
            return;
        }

        const result = await register({
            firstName: registerForm.firstName,
            lastName: registerForm.lastName,
            emailAddress: registerForm.emailAddress,
            password: registerForm.password,
        });

        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success
                    ? 'Cuenta creada. Si este entorno requiere verificación, revisá tu correo.'
                    : 'No se pudo crear la cuenta.'),
        });

        if (result.success) {
            setLoginForm((prev) => ({
                ...prev,
                emailAddress: registerForm.emailAddress,
            }));
            setRegisterForm(initialRegisterForm);
            setTab(1);
        }
    };

    const handlePasswordRecovery = async () => {
        const emailAddress = passwordRecoveryEmail.trim() || loginForm.emailAddress.trim();

        if (!emailAddress) {
            setFeedback({
                severity: 'error',
                message: 'Ingresá el email de la cuenta para recuperar la contraseña.',
            });
            return;
        }

        const result = await recoverCustomerAccess(emailAddress);
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success
                    ? 'Si existe una cuenta o historial de compras con ese correo, te enviamos instrucciones para recuperar o activar el acceso.'
                    : 'No se pudo iniciar el recupero de contraseña.'),
        });
    };

    const handleLogout = async () => {
        const result = await logout();
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message: result.message || (result.success ? 'Sesión cerrada.' : 'No se pudo cerrar la sesión.'),
        });
    };

    return (
        <Box
            sx={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    'radial-gradient(circle at top left, rgba(244,234,213,0.62), transparent 34%), linear-gradient(180deg, #fffdf8 0%, #fbf6ed 100%)',
                py: 4,
            }}
        >
            <Container maxWidth="md">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 6 },
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: 'rgba(0,72,37,0.08)',
                        bgcolor: 'rgba(255,253,248,0.94)',
                        boxShadow: '0 24px 46px rgba(0,72,37,0.08)',
                        overflow: 'hidden',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -70,
                            right: -90,
                            width: 220,
                            height: 220,
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle, rgba(199,164,107,0.18) 0%, rgba(199,164,107,0) 72%)',
                        },
                    }}
                >
                    <Stack spacing={3}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Box
                                sx={{
                                    width: { xs: 210, md: 260 },
                                }}
                            >
                                <BrandLogoImage label="CLA Soulprint" />
                            </Box>
                        </Box>

                        <Stack spacing={1} textAlign="center">
                            <Typography variant="overline" color="secondary.dark">
                                Acceso de cliente
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                                Acceso a tu cuenta
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Ingresá para conservar tu carrito, revisar tu cuenta o volver directo a la pantalla que
                                estabas usando.
                            </Typography>
                        </Stack>

                        {(feedback || authContextFeedback) && (
                            <Alert severity={(feedback || authContextFeedback)!.severity}>
                                {(feedback || authContextFeedback)!.message}
                            </Alert>
                        )}

                        {!initialized ? (
                            <Stack alignItems="center" py={6}>
                                <CircularProgress />
                            </Stack>
                        ) : isAuthenticated && customer ? (
                            <Stack spacing={3}>
                                <Alert severity="success">
                                    Sesión activa como <strong>{customer.emailAddress}</strong>.
                                </Alert>

                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                                    <Stack spacing={1.5}>
                                        <Typography variant="h6" fontWeight={700}>
                                            Hola, {customerName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Tu cuenta ya está conectada. Desde acá podés seguir al panel de cliente, al
                                            carrito o cerrar sesión.
                                        </Typography>
                                    </Stack>
                                </Paper>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TooltipButton
                                        component={Link}
                                        href={redirectTarget}
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        tooltip="Continuar con la sesión actual"
                                    >
                                        {primaryAuthenticatedLabel}
                                    </TooltipButton>
                                    <TooltipButton component={Link} href="/carrito" variant="outlined" size="large" fullWidth tooltip="Ir al carrito">
                                        Ver carrito
                                    </TooltipButton>
                                </Stack>

                                <Divider />

                                <TooltipButton
                                    variant="text"
                                    color="inherit"
                                    onClick={handleLogout}
                                    disabled={authLoading}
                                    tooltip="Cerrar la sesión actual"
                                    sx={{ alignSelf: 'center' }}
                                >
                                    Cerrar sesión
                                </TooltipButton>
                            </Stack>
                        ) : (
                            <>
                                <Tabs
                                    value={tab}
                                    onChange={(_, value) => setTab(value)}
                                    variant="fullWidth"
                                    aria-label="Acceso o registro"
                                >
                                    <Tab label="Crear cuenta" />
                                    <Tab label="Ingresar" />
                                </Tabs>

                                {tab === 0 ? (
                                    <Box component="form" onSubmit={handleRegisterSubmit}>
                                        <Stack spacing={2.25}>
                                            <TextField
                                                label="Nombre"
                                                value={registerForm.firstName}
                                                onChange={(event) =>
                                                    setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))
                                                }
                                                fullWidth
                                                required
                                            />
                                            <TextField
                                                label="Apellido"
                                                value={registerForm.lastName}
                                                onChange={(event) =>
                                                    setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))
                                                }
                                                fullWidth
                                                required
                                            />
                                            <TextField
                                                label="Email"
                                                type="email"
                                                value={registerForm.emailAddress}
                                                onChange={(event) =>
                                                    setRegisterForm((prev) => ({
                                                        ...prev,
                                                        emailAddress: event.target.value,
                                                    }))
                                                }
                                                fullWidth
                                                required
                                            />
                                            <TextField
                                                label="Contraseña"
                                                type="password"
                                                value={registerForm.password}
                                                onChange={(event) =>
                                                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                                                }
                                                helperText="Usá al menos 8 caracteres."
                                                fullWidth
                                                required
                                            />
                                            <TextField
                                                label="Confirmar contraseña"
                                                type="password"
                                                value={registerForm.confirmPassword}
                                                onChange={(event) =>
                                                    setRegisterForm((prev) => ({
                                                        ...prev,
                                                        confirmPassword: event.target.value,
                                                    }))
                                                }
                                                fullWidth
                                                required
                                            />

                                            <Alert severity="info">
                                                {REQUIRE_CUSTOMER_VERIFICATION
                                                    ? 'Te vamos a enviar un correo de verificación para activar tu cuenta.'
                                                    : 'La cuenta se crea con contraseña y después podés ingresar directamente.'}
                                            </Alert>

                                            <TooltipButton
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                disabled={authLoading}
                                                tooltip="Crear una cuenta nueva"
                                            >
                                                Crear cuenta
                                            </TooltipButton>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box component="form" onSubmit={handleLoginSubmit}>
                                        <Stack spacing={2.25}>
                                            <TextField
                                                label="Email"
                                                type="email"
                                                value={loginForm.emailAddress}
                                                onChange={(event) =>
                                                    setLoginForm((prev) => ({ ...prev, emailAddress: event.target.value }))
                                                }
                                                fullWidth
                                                required
                                            />
                                            <TextField
                                                label="Contraseña"
                                                type="password"
                                                value={loginForm.password}
                                                onChange={(event) =>
                                                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                                                }
                                                fullWidth
                                                required
                                            />
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={loginForm.rememberMe}
                                                        onChange={(event) =>
                                                            setLoginForm((prev) => ({
                                                                ...prev,
                                                                rememberMe: event.target.checked,
                                                            }))
                                                        }
                                                    />
                                                }
                                                label="Recordar sesión en este dispositivo"
                                            />

                                            <TooltipButton
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                disabled={authLoading}
                                                tooltip="Ingresar con este email y contraseña"
                                            >
                                                Ingresar
                                            </TooltipButton>

                                            <TooltipButton
                                                type="button"
                                                variant="text"
                                                onClick={() => {
                                                    setShowPasswordRecovery((current) => !current);
                                                    setPasswordRecoveryEmail((current) => current || loginForm.emailAddress);
                                                }}
                                                tooltip="Mostrar u ocultar el recupero de contraseña"
                                                sx={{ alignSelf: 'center' }}
                                            >
                                                Olvidé mi contraseña
                                            </TooltipButton>

                                            <Collapse in={showPasswordRecovery}>
                                                <Stack spacing={1.5}>
                                                    <Alert severity="info">
                                                        Ingresá tu correo y, si corresponde, te vamos a enviar
                                                        instrucciones para restablecer o activar el acceso.
                                                    </Alert>
                                                    <TextField
                                                        label="Email para recuperar"
                                                        type="email"
                                                        value={passwordRecoveryEmail}
                                                        onChange={(event) => setPasswordRecoveryEmail(event.target.value)}
                                                        fullWidth
                                                    />
                                                    <TooltipButton
                                                        type="button"
                                                        variant="outlined"
                                                        disabled={authLoading}
                                                        onClick={handlePasswordRecovery}
                                                        tooltip="Enviar enlace de recupero"
                                                    >
                                                        Enviar enlace de recupero
                                                    </TooltipButton>
                                                </Stack>
                                            </Collapse>
                                        </Stack>
                                    </Box>
                                )}

                                <Divider />

                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    Si no ves el correo de verificación, revisá spam o promociones.
                                </Typography>
                            </>
                        )}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
