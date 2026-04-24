import Link from "next/link";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { IconBrandInstagram } from "@tabler/icons-react";
import BrandLogo from "@/components/branding/BrandLogo";
import TooltipIconButton from "@/components/ui/TooltipIconButton";

const Footer = () => {
    return (
        <Box
            component="footer"
            sx={{
                mt: 'auto',
                pt: { xs: 7, md: 9 },
                pb: 3.5,
                background:
                    'linear-gradient(180deg, rgba(5,37,23,1) 0%, rgba(3,25,15,1) 100%)',
                color: 'common.white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 'auto -8rem -10rem auto',
                    width: '22rem',
                    height: '22rem',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(199,164,107,0.18) 0%, rgba(199,164,107,0) 72%)',
                },
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={{ xs: 4, md: 6 }} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
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

                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Stack spacing={1.2}>
                            <Typography variant="overline" sx={{ color: 'var(--cla-brand-cream)', letterSpacing: 2 }}>
                                Navegación
                            </Typography>
                            <Link href="/" style={{ color: 'rgba(255,255,255,0.82)' }}>Inicio</Link>
                            <Link href="/productos" style={{ color: 'rgba(255,255,255,0.82)' }}>Tienda</Link>
                            <Link href="/destacados" style={{ color: 'rgba(255,255,255,0.82)' }}>Destacados</Link>
                            <Link href="/sobre-nosotros" style={{ color: 'rgba(255,255,255,0.82)' }}>Quiénes somos</Link>
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
                                <TooltipIconButton
                                    href="https://www.instagram.com/huellas.cla/"
                                    tooltip="Seguinos en Instagram"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                        color: 'common.white',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.14)',
                                            borderColor: 'rgba(255,255,255,0.4)',
                                        },
                                    }}
                                >
                                    <IconBrandInstagram />
                                </TooltipIconButton>
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
