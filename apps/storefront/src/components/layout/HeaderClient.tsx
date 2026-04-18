'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    AppBar,
    Badge,
    Box,
    Button,
    CircularProgress,
    Container,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { buildLoginRedirectHref } from "@/lib/auth/redirects";

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
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid var(--cla-header-border)",
                backgroundColor: "var(--cla-brand-green)",
                color: "common.white",
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ gap: 2, py: 1.5, px: "0 !important" }}>
                    <Box sx={{ display: { xs: "flex", md: "none" } }}>
                        <IconButton edge="start" onClick={() => setMenuAbierto(true)} aria-label="abrir menú" color="inherit">
                            <MenuIcon />
                        </IconButton>
                    </Box>

                    <Box
                        component={Link}
                        href="/"
                        sx={{
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            textDecoration: "none",
                            color: "common.white",
                            width: { xs: "clamp(10rem, 44vw, 13rem)", md: "16.25rem" },
                            "--brand-logo-fg": "var(--header-logo-fg)",
                            "--brand-logo-bg": "var(--header-logo-bg)",
                            "&::after": {
                                content: '""',
                                position: "absolute",
                                left: 0,
                                right: "18%",
                                bottom: -8,
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
                                    <Button
                                        key={opcion.ruta}
                                        component={Link}
                                        href={opcion.ruta}
                                        color="inherit"
                                        sx={{
                                            fontWeight: activa ? 700 : 500,
                                            color: activa ? "var(--cla-brand-cream)" : "inherit",
                                        }}
                                    >
                                        {opcion.etiqueta}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: "auto", md: 0 } }}>
                        {authLoading ? (
                            <Button
                                color="inherit"
                                disabled
                                startIcon={<CircularProgress size={16} color="inherit" />}
                                sx={{ display: { xs: "none", md: "inline-flex" }, color: "inherit" }}
                            >
                                Cargando cuenta...
                            </Button>
                        ) : (
                            <Button
                                component={Link}
                                href={customer ? "/mi-cuenta" : loginHref}
                                color="inherit"
                                startIcon={<PersonOutlineOutlinedIcon />}
                                sx={{ display: { xs: "none", md: "inline-flex" }, color: "inherit" }}
                            >
                                {customer ? nombreCuenta : "Ingresar"}
                            </Button>
                        )}

                        {customer && (
                            <Button
                                color="inherit"
                                onClick={() => void handleLogout()}
                                disabled={authLoading}
                                startIcon={<LogoutOutlinedIcon />}
                                sx={{ display: { xs: "none", md: "inline-flex" }, color: "inherit" }}
                            >
                                Salir
                            </Button>
                        )}

                        <IconButton component={Link} href="/carrito" aria-label="ir al carrito" color="inherit">
                            <Badge badgeContent={cartQuantity} color="secondary" invisible={cartQuantity === 0}>
                                <ShoppingBagOutlinedIcon />
                            </Badge>
                        </IconButton>
                    </Stack>
                </Toolbar>
            </Container>

            <Drawer
                anchor="left"
                open={menuAbierto}
                onClose={() => setMenuAbierto(false)}
                PaperProps={{ sx: { width: "clamp(240px, 80vw, 280px)" } }}
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
                                <ListItemButton component={Link} href={opcion.ruta}>
                                    <ListItemText primary={opcion.etiqueta} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        <ListItem disablePadding>
                            <ListItemButton component={Link} href="/carrito">
                                <ListItemText primary={`Carrito${cartQuantity > 0 ? ` (${cartQuantity})` : ""}`} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton component={Link} href={customer ? "/mi-cuenta" : loginHref}>
                                <ListItemText
                                    primary={customer ? nombreCuenta : "Ingresar"}
                                    secondary={customer?.emailAddress}
                                />
                            </ListItemButton>
                        </ListItem>
                        {customer && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => void handleLogout()} disabled={authLoading}>
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
