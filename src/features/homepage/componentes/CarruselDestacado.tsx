"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Box, Stack, Typography, Button } from "@mui/material";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

const diapositivas = [
  {
    id: "coleccion-humana",
    titulo: "Colección humana",
    descripcion: "Joyería elegante para cada ocasión, hecha a mano con materiales hipoalergénicos.",
    imagen: "/images/products/s8.jpg",
    enlace: "/colecciones/humanos",
  },
  {
    id: "coleccion-mascotas",
    titulo: "Mascotas con estilo",
    descripcion: "Collares y dijes diseñados para tus compañeras peludas, seguros y cómodos.",
    imagen: "/images/products/s9.jpg",
    enlace: "/colecciones/mascotas",
  },
  {
    id: "combos",
    titulo: "Combos combinados",
    descripcion: "Sets coordinados para compartir estilo con tus mascotas favoritas.",
    imagen: "/images/products/s10.jpg",
    enlace: "/colecciones/combos",
  },
];

const configuracion = {
  dots: true,
  infinite: true,
  speed: 600,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 5500,
  arrows: false,
  adaptiveHeight: true,
};

export const CarruselDestacado = () => {
  return (
    <Box sx={{ position: "relative", minHeight: { xs: 420, md: 520 }, "& .slick-dots": { bottom: 16 } }}>
      <Slider {...configuracion}>
        {diapositivas.map((slide) => (
          <Box key={slide.id} sx={{ position: "relative", minHeight: { xs: 420, md: 520 } }}>
            <Image
              src={slide.imagen}
              alt={slide.titulo}
              fill
              priority
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
              <Stack spacing={2} maxWidth={520} px={3} py={6} sx={{ textAlign: { xs: "center", md: "left" } }}>
                <Typography variant="overline" color="primary.light" letterSpacing={4}>
                  CLA Joyas
                </Typography>
                <Typography variant="h3" color="common.white" fontWeight={700}>
                  {slide.titulo}
                </Typography>
                <Typography variant="h6" color="grey.100" fontWeight={400}>
                  {slide.descripcion}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent={{ xs: "center", md: "flex-start" }}>
                  <Button variant="contained" color="primary" href={slide.enlace}>
                    Ver colección
                  </Button>
                  <Button variant="outlined" color="inherit" href="/tienda">
                    Explorar tienda
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default CarruselDestacado;
