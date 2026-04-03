'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Box, Stack, Typography, Button, Container } from "@mui/material";

const diapositivas = [
    {
        id: "coleccion-humana",
        titulo: "Colección humana",
        descripcion: "Joyería elegante para cada ocasión, hecha a mano con materiales hipoalergénicos.",
        imagen: "/images/carrousel/carrousel1.png",
        enlace: "/productos",
    },
    {
        id: "coleccion-mascotas",
        titulo: "Mascotas con estilo.",
        descripcion: "Collares y dijes diseñados para tus compañeras peludas, seguros y cómodos.",
        imagen: "/images/carrousel/carrousel2.png",
        enlace: "/productos",
    },
    {
        id: "combos",
        titulo: "Combos combinados",
        descripcion: "Sets coordinados para compartir estilo con tus mascotas favoritas.",
        imagen: "/images/carrousel/carrousel3.png",
        enlace: "/productos",
    },
];

const CarruselDestacado = () => {
    const [activeStep, setActiveStep] = useState(0);
    const maxSteps = diapositivas.length;

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps);
        }, 5500);
        return () => clearInterval(timer);
    }, [maxSteps]);

    return (
        <Box sx={{ position: "relative", minHeight: { xs: 500, md: 650 }, overflow: 'hidden' }}>
            {diapositivas.map((slide, index) => (
                <Box
                    key={slide.id}
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: index === activeStep ? 1 : 0,
                        transition: 'opacity 1s ease-in-out',
                        zIndex: index === activeStep ? 1 : 0,
                    }}
                >
                    <Image
                        src={slide.imagen}
                        alt={slide.titulo}
                        fill
                        priority={index === 0}
                        sizes="100vw"
                        style={{ objectFit: "cover" }}
                    />
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(120deg, rgba(18,18,18,0.7) 0%, rgba(18,18,18,0.2) 60%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Container maxWidth="lg" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                            <Stack
                                spacing={3}
                                maxWidth={600}
                                sx={{
                                    px: { xs: 2.5, md: 3 },
                                    py: { xs: 4, md: 6 },
                                    textAlign: { xs: "center", md: "left" },
                                    alignItems: { xs: "center", md: "flex-start" },
                                }}
                            >
                                <Typography
                                    variant="overline"
                                    color="primary.light"
                                    letterSpacing={4}
                                    sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
                                >
                                    CLA Joyas
                                </Typography>
                                <Typography variant="h2" color="common.white" fontWeight={700} sx={{ typography: { xs: 'h3', md: 'h1' } }}>
                                    {slide.titulo}
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="grey.300"
                                    fontWeight={400}
                                    sx={{ mb: 2, typography: { xs: 'body1', md: 'h5' } }}
                                >
                                    {slide.descripcion}
                                </Typography>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent={{ xs: "center", md: "flex-start" }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        href={slide.enlace}
                                        sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 1.25, md: 1.5 }, fontSize: { xs: '0.9rem', md: '1.1rem' } }}
                                    >
                                        Ver colección
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        size="large"
                                        href="/productos"
                                        sx={{
                                            px: { xs: 2.5, md: 4 },
                                            py: { xs: 1.25, md: 1.5 },
                                            fontSize: { xs: '0.9rem', md: '1.1rem' },
                                            borderColor: 'white',
                                            color: 'white',
                                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                                        }}
                                    >
                                        Explorar tienda
                                    </Button>
                                </Stack>
                            </Stack>
                        </Container>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default CarruselDestacado;
