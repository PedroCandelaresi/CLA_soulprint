import { Container, Box, Typography, Paper, Stack } from '@mui/material';
import BrandLogo from '@/components/branding/BrandLogo';

export default function LoginPage() {
    return (
        <Box
            sx={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(244, 234, 213, 0.34) 0%, rgba(255, 255, 255, 1) 58%)',
                py: 4,
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 6 },
                        borderRadius: 4,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box
                        sx={{
                            mb: 4,
                            display: 'grid',
                            justifyItems: 'center',
                            gap: 1.75,
                            '--brand-logo-fg': 'var(--surface-logo-fg)',
                            '--brand-logo-bg': 'var(--surface-logo-bg)',
                        }}
                    >
                        <BrandLogo label="CLA Soulprint" style={{ width: 'clamp(9.5rem, 38vw, 11.25rem)' }} />
                        <Box
                            aria-hidden
                            sx={{
                                width: 'min(8rem, 42%)',
                                height: '1px',
                                background: 'linear-gradient(90deg, transparent, var(--brand-accent), transparent)',
                            }}
                        />
                    </Box>

                    <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'var(--cla-brand-green)' }}>
                        Acceso de clientes no disponible
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        La autenticación de clientes todavía no está habilitada en esta tienda.
                    </Typography>

                    <Stack spacing={2} sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            El historial de pedidos, el acceso con email y el registro de clientes siguen en desarrollo.
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            Cuando estas funciones estén disponibles, se publicarán nuevamente desde el encabezado principal.
                        </Typography>
                    </Stack>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Por ahora, esta tienda funciona como catálogo público.
                        </Typography>
                        <Box mt={2}>
                            <Typography variant="caption" color="text.disabled">
                                (Autenticación y compra online en desarrollo)
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
