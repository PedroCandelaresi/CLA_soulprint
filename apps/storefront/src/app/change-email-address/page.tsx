import { Alert, Stack, Typography } from '@mui/material';
import AuthPageShell from '@/components/auth/AuthPageShell';

export default function ChangeEmailAddressPage() {
    return (
        <AuthPageShell
            title="Cambiar email"
            subtitle="La ruta pública está reservada para el flujo de cambio de email de Vendure."
            footerText="¿Querés volver a tu cuenta?"
            footerLinkLabel="Ir al dashboard"
            footerHref="/auth/account"
        >
            <Stack spacing={2.5}>
                <Alert severity="info">
                    El cambio de email todavía no tiene pantalla dedicada en storefront. Cuando habilitemos ese paso, este link va a completar la confirmación sin romper los correos del sistema.
                </Alert>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Por ahora usá el email actual de tu cuenta para comprar y gestionar pedidos.
                </Typography>
            </Stack>
        </AuthPageShell>
    );
}
