'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    AppBar,
    Badge,
    Box,
    CircularProgress,
    Container,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
    Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { buildLoginRedirectHref } from "@/lib/auth/redirects";
import TooltipButton from "@/components/ui/TooltipButton";
import TooltipIconButton from "@/components/ui/TooltipIconButton";

type OpcionMenu = {
    etiqueta: string;
    ruta: string;
};

type HeaderClientProps = {
    headerLogo: ReactNode;
    drawerLogo: ReactNode;
    drawerDecorativeLogo: ReactNode;
};

const opcionesMenu: OpcionMenu[] = [
    { etiqueta: "Inicio", ruta: "/" },
    { etiqueta: "Tienda", ruta: "/productos" },
    { etiqueta: "Destacados", ruta: "/destacados" },
    { etiqueta: "Cómo comprar", ruta: "/como-comprar" },
    { etiqueta: "Quiénes somos", ruta: "/sobre-nosotros" },
];

export default function HeaderClient({
    headerLogo,
    drawerLogo,
    drawerDecorativeLogo,
}: HeaderClientProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { cartQuantity, customer, authLoading, logout } = useStorefront();
    const redirectTarget = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    const loginHref = buildLoginRedirectHref(redirectTarget);
    const nombreCuenta =
        customer?.firstName?.trim() ||
        customer?.lastName?.trim() ||
        customer?.emailAddress ||
        "Mi cuenta";

    const handleLogout = async () => {
        await logout();
        setMenuAbierto(false);
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                backdropFilter: "blur(10px)",
                borderBottom: "1px solid var(--cla-header-border)",
                backgroundColor: "var(--cla-brand-green)",
                color: "common.white",
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ gap: 2, py: 1.5, px: "0 !important" }}>
                    <Box sx={{ display: { xs: "flex", md: "none" } }}>
                        <TooltipIconButton
                            edge="start"
                            onClick={() => setMenuAbierto(true)}
                            aria-label="abrir menú"
                            color="inherit"
                            tooltip="Abrir navegación"
                            sx={{
                                bgcolor: "transparent",
                                border: "1px solid rgba(255,255,255,0.2)",
                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.08)",
                                    borderColor: "rgba(255,255,255,0.32)",
                                    boxShadow: "none",
                                    transform: "none",
                                },
                            }}
                        >
                            <MenuIcon />
                        </TooltipIconButton>
                    </Box>

                    <Box
                        component={Link}
                        href="/"
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            textDecoration: "none",
                            color: "common.white",
                            width: { xs: "clamp(10rem, 44vw, 13rem)", md: "15.5rem" },
                            flexShrink: 0,
                            lineHeight: 0,
                            "--brand-logo-fg": "var(--header-logo-fg)",
                            "--brand-logo-bg": "var(--header-logo-bg)",
                        }}
                    >
                        {headerLogo}
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            {opcionesMenu.map((opcion) => {
                                const activa = pathname === opcion.ruta;

                                return (
                                    <TooltipButton
                                        key={opcion.ruta}
                                        href={opcion.ruta}
                                        color="inherit"
                                        tooltip={`Ir a ${opcion.etiqueta}`}
                                        sx={{
                                            minWidth: "auto",
                                            fontWeight: activa ? 700 : 500,
                                            color: activa ? "var(--cla-brand-cream)" : "rgba(255,255,255,0.9)",
                                            px: 1.6,
                                            py: 0.7,
                                            borderRadius: 999,
                                            backgroundColor: activa ? "rgba(255,255,255,0.08)" : "transparent",
                                            "&:hover": {
                                                backgroundColor: "rgba(255,255,255,0.1)",
                                                color: "common.white",
                                            },
                                        }}
                                    >
                                        {opcion.etiqueta}
                                    </TooltipButton>
                                );
                            })}
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: "auto", md: 0 } }}>
                        {authLoading ? (
                            <TooltipButton
                                color="inherit"
                                disabled
                                startIcon={<CircularProgress size={16} color="inherit" />}
                                tooltip="Sincronizando tu sesión"
                                sx={{ display: { xs: "none", md: "inline-flex" }, color: "inherit" }}
                            >
                                Cargando cuenta...
                            </TooltipButton>
                        ) : (
                            <TooltipButton
                                href={customer ? "/mi-cuenta" : loginHref}
                                color="inherit"
                                startIcon={<PersonOutlineOutlinedIcon />}
                                endIcon={<ArrowOutwardRoundedIcon sx={{ fontSize: 18 }} />}
                                tooltip={customer ? "Abrir tu centro de cuenta" : "Ingresar o crear cuenta"}
                                sx={{
                                    display: { xs: "none", md: "inline-flex" },
                                    color: "inherit",
                                    bgcolor: "transparent",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                    },
                                }}
                            >
                                {customer ? nombreCuenta : "Ingresar"}
                            </TooltipButton>
                        )}

                        {customer && (
                            <TooltipButton
                                color="inherit"
                                onClick={() => void handleLogout()}
                                disabled={authLoading}
                                startIcon={<LogoutOutlinedIcon />}
                                tooltip="Cerrar sesión actual"
                                sx={{
                                    display: { xs: "none", md: "inline-flex" },
                                    color: "inherit",
                                    bgcolor: "transparent",
                                    border: "1px solid rgba(255,255,255,0.16)",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                    },
                                }}
                            >
                                Salir
                            </TooltipButton>
                        )}

                        <TooltipIconButton
                            href="/carrito"
                            aria-label="ir al carrito"
                            color="inherit"
                            tooltip={cartQuantity > 0 ? `Ver carrito con ${cartQuantity} producto${cartQuantity === 1 ? "" : "s"}` : "Ver carrito"}
                            sx={{
                                bgcolor: "transparent",
                                border: "1px solid rgba(255,255,255,0.2)",
                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.08)",
                                    borderColor: "rgba(255,255,255,0.32)",
                                    boxShadow: "none",
                                    transform: "none",
                                },
                            }}
                        >
                            <Badge badgeContent={cartQuantity} color="secondary" invisible={cartQuantity === 0}>
                                <ShoppingBagOutlinedIcon />
                            </Badge>
                        </TooltipIconButton>
                    </Stack>
                </Toolbar>
            </Container>

            <Drawer
                anchor="left"
                open={menuAbierto}
                onClose={() => setMenuAbierto(false)}
                PaperProps={{
                    sx: {
                        width: "clamp(240px, 80vw, 300px)",
                        bgcolor: "rgba(255,250,242,0.98)",
                        backdropFilter: "blur(12px)",
                    },
                }}
            >
                <Box sx={{ width: "100%", height: "100%" }} role="presentation" onClick={() => setMenuAbierto(false)}>
                    <Box
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            px: 3,
                            pt: 3,
                            pb: 2.5,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            backgroundColor: "rgba(255,250,242,0.98)",
                            "--brand-logo-fg": "var(--muted-logo-fg)",
                            "--brand-logo-bg": "transparent",
                        }}
                    >
                        <Box
                            aria-hidden
                            sx={{
                                position: "absolute",
                                top: -18,
                                right: -54,
                                width: "11.5rem",
                                opacity: 0.07,
                                transform: "rotate(-4deg)",
                                pointerEvents: "none",
                            }}
                        >
                            {drawerDecorativeLogo}
                        </Box>

                        <Box sx={{ position: "relative", zIndex: 1, width: "10.5rem" }}>{drawerLogo}</Box>

                        <Typography sx={{ position: "relative", zIndex: 1, mt: 1.5, color: "text.secondary" }}>
                            Navegación curada para explorar la tienda CLA con una experiencia más serena.
                        </Typography>
                    </Box>

                    <List sx={{ py: 1 }}>
                        {opcionesMenu.map((opcion) => (
                            <ListItem key={opcion.ruta} disablePadding>
                                <ListItemButton component={Link} href={opcion.ruta} sx={{ mx: 1, my: 0.3 }}>
                                    <ListItemText primary={opcion.etiqueta} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        <ListItem disablePadding>
                            <ListItemButton component={Link} href="/carrito" sx={{ mx: 1, my: 0.3 }}>
                                <ListItemText primary={`Carrito${cartQuantity > 0 ? ` (${cartQuantity})` : ""}`} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton component={Link} href={customer ? "/mi-cuenta" : loginHref} sx={{ mx: 1, my: 0.3 }}>
                                <ListItemText
                                    primary={customer ? nombreCuenta : "Ingresar"}
                                    secondary={customer?.emailAddress}
                                />
                            </ListItemButton>
                        </ListItem>
                        {customer && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => void handleLogout()} disabled={authLoading} sx={{ mx: 1, my: 0.3 }}>
                                    <ListItemText primary="Cerrar sesión" />
                                </ListItemButton>
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
}
