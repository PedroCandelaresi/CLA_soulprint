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
                backdropFilter: "blur(18px)",
                borderBottom: "1px solid rgba(244,234,213,0.14)",
                background:
                    "linear-gradient(180deg, rgba(3,25,15,0.96) 0%, rgba(5,37,23,0.9) 100%)",
                color: "common.white",
                overflow: "hidden",
                "&::after": {
                    content: '""',
                    position: "absolute",
                    insetInline: 0,
                    bottom: 0,
                    height: 1,
                    background:
                        "linear-gradient(90deg, transparent 0%, rgba(244,234,213,0.12) 14%, rgba(244,234,213,0.42) 50%, rgba(244,234,213,0.12) 86%, transparent 100%)",
                },
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ gap: 2, py: 1.25, px: "0 !important" }}>
                    <Box sx={{ display: { xs: "flex", md: "none" } }}>
                        <TooltipIconButton
                            edge="start"
                            onClick={() => setMenuAbierto(true)}
                            aria-label="abrir menú"
                            color="inherit"
                            tooltip="Abrir navegación"
                        >
                            <MenuIcon />
                        </TooltipIconButton>
                    </Box>

                    <Box
                        component={Link}
                        href="/"
                        sx={{
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1.25,
                            textDecoration: "none",
                            color: "common.white",
                            width: { xs: "clamp(10rem, 44vw, 13rem)", md: "16.25rem" },
                            px: { xs: 0, md: 1.5 },
                            py: { xs: 0.35, md: 0.65 },
                            borderRadius: 999,
                            backgroundColor: { xs: "transparent", md: "rgba(255,255,255,0.04)" },
                            border: { xs: "none", md: "1px solid rgba(244,234,213,0.1)" },
                            "--brand-logo-fg": "var(--header-logo-fg)",
                            "--brand-logo-bg": "var(--header-logo-bg)",
                            "&::after": {
                                content: '""',
                                position: "absolute",
                                left: { xs: 0, md: 18 },
                                right: { xs: "18%", md: 22 },
                                bottom: { xs: -8, md: -6 },
                                height: "1px",
                                background:
                                    "linear-gradient(90deg, rgba(244, 234, 213, 0.75), rgba(244, 234, 213, 0.18), transparent)",
                                pointerEvents: "none",
                            },
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
                                            fontWeight: activa ? 700 : 500,
                                            color: activa ? "var(--cla-brand-cream)" : "rgba(255,255,255,0.82)",
                                            px: 2.2,
                                            py: 1,
                                            borderRadius: 999,
                                            backgroundColor: activa ? "rgba(255,255,255,0.08)" : "transparent",
                                            border: "1px solid",
                                            borderColor: activa ? "rgba(244,234,213,0.18)" : "transparent",
                                            "&:hover": {
                                                backgroundColor: activa
                                                    ? "rgba(255,255,255,0.12)"
                                                    : "rgba(255,255,255,0.06)",
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
                                    bgcolor: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(244,234,213,0.12)",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.1)",
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
                                    bgcolor: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(244,234,213,0.1)",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                    },
                                }}
                            >
                                Salir
                            </TooltipButton>
                        )}

                        <TooltipIconButton
                            component={Link}
                            href="/carrito"
                            aria-label="ir al carrito"
                            color="inherit"
                            tooltip={cartQuantity > 0 ? `Ver carrito con ${cartQuantity} producto${cartQuantity === 1 ? "" : "s"}` : "Ver carrito"}
                            sx={{
                                bgcolor: "rgba(244,234,213,0.12)",
                                borderColor: "rgba(244,234,213,0.2)",
                                "&:hover": {
                                    bgcolor: "rgba(244,234,213,0.18)",
                                    borderColor: "rgba(244,234,213,0.34)",
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
                        bgcolor: "rgba(255,250,242,0.94)",
                        backdropFilter: "blur(18px)",
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
                            background:
                                "linear-gradient(180deg, rgba(244,234,213,0.42) 0%, rgba(255,250,242,0.9) 100%)",
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

                        <Box
                            aria-hidden
                            sx={{
                                position: "relative",
                                zIndex: 1,
                                mt: 2,
                                width: "78%",
                                height: "1px",
                                background: "linear-gradient(90deg, var(--brand-accent), transparent)",
                            }}
                        />
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
