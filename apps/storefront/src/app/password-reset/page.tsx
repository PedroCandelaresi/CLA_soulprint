import { Alert, Stack, Typography } from '@mui/material';
import AuthPageShell from '@/components/auth/AuthPageShell';

export default function PasswordResetPage() {
    return (
        <AuthPageShell
            title="Recuperar acceso"
            subtitle="La ruta pública ya existe para no romper los links de email del sistema."
            footerText="¿Recordaste tu contraseña?"
            footerLinkLabel="Ingresá"
            footerHref="/auth/login"
        >
            <Stack spacing={2.5}>
                <Alert severity="info">
                    La recuperación automática de contraseña todavía no está habilitada en storefront. Si necesitás restablecerla, escribinos y lo resolvemos desde soporte mientras cerramos esa pantalla.
                </Alert>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    El link de email no va a devolver 404, pero esta parte del flujo queda pendiente para la siguiente iteración.
                </Typography>
            </Stack>
        </AuthPageShell>
    );
}
