'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    IconButton,
    Badge,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    InputBase,
    Container
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";

type OpcionMenu = {
    etiqueta: string;
    ruta: string;
};

const colorPrincipal = "#004825";

const opcionesMenu: OpcionMenu[] = [
    { etiqueta: "Inicio", ruta: "/" },
    { etiqueta: "Tienda", ruta: "/productos" },
    { etiqueta: "Joyería personalizada", ruta: "/joyeria-personalizada" },
    { etiqueta: "Cómo comprar", ruta: "/como-comprar" },
    { etiqueta: "Quiénes somos", ruta: "/quienes-somos" },
];

const Header = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const pathname = usePathname();

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
                            color: activa ? "#F4EAD5" : "inherit",
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
                borderBottom: (tema) => `1px solid ${alpha(colorPrincipal, 0.4)}`,
                backgroundColor: colorPrincipal,
                color: "common.white",
            }}
        >
            <Container maxWidth="xl">
                <Toolbar sx={{ gap: 2, py: 1.5, px: '0 !important' }}>
                    <Box sx={{ display: { xs: "flex", md: "none" } }}>
                        <IconButton edge="start" onClick={() => setMenuAbierto(true)} aria-label="abrir menú" color="inherit">
                            <MenuIcon />
                        </IconButton>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        component={Link}
                        href="/"
                        sx={{ textDecoration: "none" }}
                    >
                        <Image src="/images/logos/CLA.svg" alt="Logo CLA" width={260} height={78} style={{ maxWidth: '100%', height: 'auto' }} />
                    </Stack>

                    <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
                        {renderOpciones()}
                    </Box>

                    <Stack direction="row" spacing={1.5} alignItems="center">


                        <IconButton color="inherit" aria-label="ver carrito">
                            <Badge badgeContent={2} color="secondary">
                                <ShoppingBagIcon />
                            </Badge>
                        </IconButton>

                        <Button
                            variant="contained"
                            component={Link}
                            href="/auth/login"
                            sx={{
                                bgcolor: "common.white",
                                color: colorPrincipal,
                                fontWeight: 600,
                                "&:hover": {
                                    bgcolor: alpha("#FFFFFF", 0.85),
                                },
                                display: { xs: 'none', sm: 'flex' }
                            }}
                        >
                            Ingresar
                        </Button>
                    </Stack>
                </Toolbar>
            </Container>


            <Drawer anchor="left" open={menuAbierto} onClose={() => setMenuAbierto(false)}>
                <Box sx={{ width: 280 }} role="presentation" onClick={() => setMenuAbierto(false)}>
                    <List>
                        {opcionesMenu.map((opcion) => (
                            <ListItem key={opcion.ruta} disablePadding>
                                <ListItemButton component={Link} href={opcion.ruta}>
                                    <ListItemText primary={opcion.etiqueta} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
};

export default Header;
