'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Avatar,
    Box,
    Container,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import { buildLoginRedirectHref } from '@/lib/auth/redirects';
import { useCustomerAccount } from './CustomerAccountProvider';
import {
    AccountLoadingState,
    AccountSectionCard,
    AccountStatusChip,
} from './AccountShared';
import {
    getCustomerDisplayName,
    getCustomerInitials,
    getOrderStatusPresentation,
} from './accountPresentation';
import TooltipButton from '@/components/ui/TooltipButton';

const accountNavItems = [
    {
        href: '/mi-cuenta',
        label: 'Resumen',
        icon: <DashboardRoundedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/pedidos',
        label: 'Mis pedidos',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/seguimiento',
        label: 'Seguimiento',
        icon: <LocalShippingOutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/direcciones',
        label: 'Direcciones',
        icon: <HomeOutlinedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/perfil',
        label: 'Datos personales',
        icon: <PersonOutlineRoundedIcon fontSize="small" />,
    },
    {
        href: '/mi-cuenta/seguridad',
        label: 'Seguridad',
        icon: <LockOutlinedIcon fontSize="small" />,
    },
];

function matchesPath(currentPath: string, targetPath: string): boolean {
    if (targetPath === '/mi-cuenta') {
        return currentPath === targetPath;
    }

    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function CustomerAccountShell({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { authLoading, initialized, isAuthenticated, logout } = useStorefront();
    const { accountLoading, customer, orders } = useCustomerAccount();

    const redirectTarget = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    useEffect(() => {
        if (!initialized || isAuthenticated) {
            return;
        }

        router.replace(buildLoginRedirectHref(redirectTarget));
    }, [initialized, isAuthenticated, redirectTarget, router]);

    const latestOrder = orders[0];
    const latestOrderStatus = latestOrder ? getOrderStatusPresentation(latestOrder) : null;

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    if (!initialized) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                <AccountLoadingState
                    title="Cargando tu espacio de cliente"
                    message="Estamos validando tu sesión y preparando tu cuenta."
                />
            </Container>
        );
    }

    if (!isAuthenticated) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                <AccountLoadingState
                    title="Redirigiendo al acceso"
                    message="Necesitás iniciar sesión para ver y administrar tu cuenta."
                />
            </Container>
        );
    }

    if (accountLoading && !customer) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                <AccountLoadingState
                    title="Sincronizando tu cuenta"
                    message="Estamos trayendo tus pedidos, direcciones y datos personales."
                />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
            <Stack spacing={3}>
                <AccountSectionCard
                    sx={{
                        overflow: 'hidden',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${alpha(
                            theme.palette.primary.main,
                            0.84,
                        )} 58%, ${alpha(theme.palette.secondary.dark, 0.72)} 100%)`,
                        color: 'common.white',
                        borderColor: alpha(theme.palette.common.white, 0.08),
                        boxShadow: '0 28px 56px rgba(6,38,22,0.18)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={3}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                                sx={{
                                    width: 62,
                                    height: 62,
                                    bgcolor: alpha(theme.palette.common.white, 0.16),
                                    color: 'common.white',
                                    fontWeight: 700,
                                    border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
                                }}
                            >
                                {getCustomerInitials(customer)}
                            </Avatar>
                            <Stack spacing={0.5}>
                                <Typography variant="h4" fontWeight={700}>
                                    {getCustomerDisplayName(customer)}
                                </Typography>
                                {customer?.emailAddress && (
                                    <Typography
                                        variant="body1"
                                        sx={{ color: alpha(theme.palette.common.white, 0.86) }}
                                    >
                                        {customer.emailAddress}
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.72) }}>
                                    Administrá tus pedidos, direcciones y datos de acceso desde un solo lugar.
                                </Typography>
                            </Stack>
                        </Stack>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.25}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                            <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                                    Pedidos registrados
                                </Typography>
                                <Typography variant="h5" fontWeight={700}>
                                    {orders.length}
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    width: 1,
                                    height: { xs: 1, sm: 40 },
                                    minWidth: { xs: 0, sm: 1 },
                                    bgcolor: alpha(theme.palette.common.white, 0.18),
                                    display: { xs: 'none', sm: 'block' },
                                }}
                            />
                            <Stack spacing={0.5}>
                                <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                                    Estado más reciente
                                </Typography>
                                {latestOrder && latestOrderStatus ? (
                                    <Stack spacing={0.5}>
                                        <Typography variant="body1" fontWeight={700}>
                                            Pedido {latestOrder.code}
                                        </Typography>
                                        <AccountStatusChip
                                            label={latestOrderStatus.label}
                                            color={latestOrderStatus.tone}
                                        />
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.82) }}>
                                        Todavía no registrás compras finalizadas.
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    </Stack>
                </AccountSectionCard>

                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        gap: 1,
                        overflowX: 'auto',
                        pb: 0.5,
                    }}
                >
                    {accountNavItems.map((item) => {
                        const selected = matchesPath(pathname, item.href);
                        return (
                            <TooltipButton
                                key={item.href}
                                href={item.href}
                                variant={selected ? 'contained' : 'outlined'}
                                startIcon={item.icon}
                                tooltip={`Ir a ${item.label}`}
                                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                            >
                                {item.label}
                            </TooltipButton>
                        );
                    })}
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
                        alignItems: 'start',
                    }}
                >
                    <AccountSectionCard sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 108 }}>
                        <Stack spacing={2.5}>
                            <Stack spacing={0.5}>
                                <Typography variant="h6" fontWeight={700}>
                                    Centro de cuenta
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Una vista centralizada para gestionar tu experiencia de compra.
                                </Typography>
                            </Stack>

                            <List disablePadding sx={{ display: 'grid', gap: 0.75 }}>
                                {accountNavItems.map((item) => {
                                    const selected = matchesPath(pathname, item.href);
                                    return (
                                        <ListItemButton
                                            key={item.href}
                                            component={Link}
                                            href={item.href}
                                            selected={selected}
                                            sx={{
                                                borderRadius: 3,
                                                px: 1.5,
                                                py: 1.1,
                                                border: '1px solid',
                                                borderColor: selected ? 'primary.main' : 'divider',
                                                bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                {item.icon}
                                                <ListItemText
                                                    primary={item.label}
                                                    primaryTypographyProps={{
                                                        fontWeight: selected ? 700 : 500,
                                                    }}
                                                />
                                            </Stack>
                                        </ListItemButton>
                                    );
                                })}
                            </List>

                            <TooltipButton
                                variant="text"
                                color="inherit"
                                startIcon={<LogoutOutlinedIcon fontSize="small" />}
                                onClick={handleLogout}
                                disabled={authLoading}
                                tooltip="Cerrar la sesión actual"
                                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                            >
                                Cerrar sesión
                            </TooltipButton>
                        </Stack>
                    </AccountSectionCard>

                    <Stack spacing={3}>
                        {children}
                    </Stack>
                </Box>
            </Stack>
        </Container>
    );
}
