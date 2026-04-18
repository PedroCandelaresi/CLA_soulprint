import Link from "next/link";
import { Box, Container, Grid, IconButton, Stack, Typography } from "@mui/material";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";
import BrandLogo from "@/components/branding/BrandLogo";

const Footer = () => {
    return (
        <Box
            component="footer"
            sx={{
                mt: 'auto',
                pt: { xs: 6, md: 8 },
                pb: 3,
                bgcolor: 'var(--cla-brand-green)',
                color: 'common.white',
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Stack spacing={2.5}>
                            <Box
                                sx={{
                                    width: { xs: 220, md: 270 },
                                    maxWidth: '100%',
                                    '--brand-logo-fg': '#FFFFFF',
                                    '--brand-logo-bg': 'transparent',
                                }}
                            >
                                <BrandLogo label="CLA Soulprint" />
                            </Box>

                            <Typography sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.8, maxWidth: 420 }}>
                                Una tienda con estética cálida, piezas con memoria y una mirada sensible sobre los
                                vínculos entre personas, mascotas y objetos que acompañan la vida cotidiana.
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Stack spacing={1.2}>
                            <Typography variant="overline" sx={{ color: 'var(--cla-brand-cream)', letterSpacing: 2 }}>
                                Navegación
                            </Typography>
                            <Link href="/" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.82)' }}>
                                Inicio
                            </Link>
                            <Link href="/productos" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.82)' }}>
                                Tienda
                            </Link>
                            <Link href="/destacados" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.82)' }}>
                                Destacados
                            </Link>
                            <Link href="/sobre-nosotros" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.82)' }}>
                                Quiénes somos
                            </Link>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Stack spacing={2}>
                            <Typography variant="overline" sx={{ color: 'var(--cla-brand-cream)', letterSpacing: 2 }}>
                                Comunidad
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.8 }}>
                                Seguinos para descubrir nuevas colecciones, historias detrás de cada pieza y
                                lanzamientos especiales.
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <IconButton
                                    href="#"
                                    sx={{
                                        color: 'common.white',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <IconBrandInstagram />
                                </IconButton>
                                <IconButton
                                    href="#"
                                    sx={{
                                        color: 'common.white',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <IconBrandFacebook />
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Grid>
                </Grid>

                <Box
                    sx={{
                        mt: { xs: 5, md: 6 },
                        pt: 2.5,
                        borderTop: '1px solid rgba(255,255,255,0.14)',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                        © 2026 CLA Soulprint
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default Footer;
