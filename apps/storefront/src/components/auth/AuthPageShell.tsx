import Link from 'next/link';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import BrandLogo from '@/components/branding/BrandLogo';

interface AuthPageShellProps {
    title: string;
    subtitle: string;
    footerText: string;
    footerLinkLabel: string;
    footerHref: string;
    children: React.ReactNode;
}

export default function AuthPageShell({
    title,
    subtitle,
    footerText,
    footerLinkLabel,
    footerHref,
    children,
}: AuthPageShellProps) {
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
                        p: { xs: 3, md: 5 },
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Stack spacing={3}>
                        <Stack alignItems="center" spacing={1.75}>
                            <Box
                                sx={{
                                    '--brand-logo-fg': 'var(--surface-logo-fg)',
                                    '--brand-logo-bg': 'var(--surface-logo-bg)',
                                }}
                            >
                                <BrandLogo label="CLA Soulprint" style={{ width: 'clamp(9.5rem, 38vw, 11.25rem)' }} />
                            </Box>
                            <Box
                                aria-hidden
                                sx={{
                                    width: 'min(8rem, 42%)',
                                    height: '1px',
                                    background: 'linear-gradient(90deg, transparent, var(--brand-accent), transparent)',
                                }}
                            />
                        </Stack>

                        <Box textAlign="center">
                            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'var(--cla-brand-green)' }}>
                                {title}
                            </Typography>
                            <Typography color="text.secondary">
                                {subtitle}
                            </Typography>
                        </Box>

                        {children}

                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            {footerText}{' '}
                            <Box component={Link} href={footerHref} sx={{ color: 'var(--cla-brand-green)', fontWeight: 600 }}>
                                {footerLinkLabel}
                            </Box>
                        </Typography>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
