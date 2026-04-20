import Link from "next/link";
import { Box, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";
import BrandLogo from "@/components/branding/BrandLogo";
import TooltipButton from "@/components/ui/TooltipButton";
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
                <Box
                    sx={{
                        mb: { xs: 4, md: 5 },
                        p: { xs: 3, md: 3.5 },
                        borderRadius: 6,
                        border: '1px solid rgba(244,234,213,0.12)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        backdropFilter: 'blur(14px)',
                    }}
                >
                    <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Stack spacing={1.25}>
                                <Typography variant="overline" sx={{ color: 'rgba(244,234,213,0.72)' }}>
                                    Universo CLA Soulprint
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'common.white' }}>
                                    Una tienda sensible, cálida y contemporánea para vínculos que dejan huella.
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.25}
                                justifyContent={{ xs: 'stretch', md: 'flex-end' }}
                            >
                                <TooltipButton
                                    href="/productos"
                                    variant="contained"
                                    color="secondary"
                                    tooltip="Explorar la tienda completa"
                                >
                                    Explorar piezas
                                </TooltipButton>
                                <TooltipButton
                                    href="/sobre-nosotros"
                                    variant="outlined"
                                    color="inherit"
                                    tooltip="Conocer la identidad de la marca"
                                    sx={{
                                        color: 'common.white',
                                        borderColor: 'rgba(244,234,213,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        '&:hover': {
                                            borderColor: 'rgba(244,234,213,0.4)',
                                            bgcolor: 'rgba(255,255,255,0.08)',
                                        },
                                    }}
                                >
                                    Ver identidad
                                </TooltipButton>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>

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

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                <Chip label="Elegancia cálida" size="small" sx={{ color: 'common.white', borderColor: 'rgba(244,234,213,0.18)' }} variant="outlined" />
                                <Chip label="Editorial" size="small" sx={{ color: 'common.white', borderColor: 'rgba(244,234,213,0.18)' }} variant="outlined" />
                                <Chip label="Con identidad" size="small" sx={{ color: 'common.white', borderColor: 'rgba(244,234,213,0.18)' }} variant="outlined" />
                            </Stack>

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
                                    href="#"
                                    tooltip="Ir al Instagram de CLA Soulprint"
                                    sx={{
                                        color: 'common.white',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <IconBrandInstagram />
                                </TooltipIconButton>
                                <TooltipIconButton
                                    href="#"
                                    tooltip="Ir al Facebook de CLA Soulprint"
                                    sx={{
                                        color: 'common.white',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <IconBrandFacebook />
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
