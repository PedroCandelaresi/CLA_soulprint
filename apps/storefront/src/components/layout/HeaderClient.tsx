'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    AppBar,
    Badge,
    Box,
    Toolbar,
    IconButton,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Container,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useCart } from "@/components/cart/CartProvider";

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
    { etiqueta: "Joyería personalizada", ruta: "/joyeria-personalizada" },
    { etiqueta: "Cómo comprar", ruta: "/como-comprar" },
    { etiqueta: "Quiénes somos", ruta: "/quienes-somos" },
];

export default function HeaderClient({ headerLogo, drawerLogo, drawerDecorativeLogo }: HeaderClientProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const pathname = usePathname();
    const { totalQuantity } = useCart();

    const renderOpciones = () => (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
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
                            textTransform: "none",
                        }}
                    >
                        {opcion.etiqueta}
                    </Button>
                );
            })}
        </Stack>
    );

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
                                background: "linear-gradient(90deg, rgba(244, 234, 213, 0.75), rgba(244, 234, 213, 0.18), transparent)",
                                pointerEvents: "none",
                            },
                        }}
                    >
                        {headerLogo}
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
                        {renderOpciones()}
                    </Box>

                    <IconButton
                        component={Link}
                        href="/carrito"
                        aria-label="ir al carrito"
                        color="inherit"
                        sx={{ ml: "auto" }}
                    >
                        <Badge badgeContent={totalQuantity} color="secondary" invisible={totalQuantity === 0}>
                            <ShoppingBagOutlinedIcon />
                        </Badge>
                    </IconButton>
                </Toolbar>
            </Container>

            <Drawer anchor="left" open={menuAbierto} onClose={() => setMenuAbierto(false)}>
                <Box sx={{ width: 280, height: "100%" }} role="presentation" onClick={() => setMenuAbierto(false)}>
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
                                <ListItemText primary={`Carrito${totalQuantity > 0 ? ` (${totalQuantity})` : ""}`} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
}
