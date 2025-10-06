"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Chip,
} from "@mui/material";

interface ProductoDestacado {
  id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
  etiquetas: string[];
  enlace: string;
}

const productosDestacados: ProductoDestacado[] = [
  {
    id: "medalla-aurora",
    nombre: "Medalla Aurora",
    descripcion: "Medalla de latón con grabado láser de alta precisión y recubrimiento anti desgaste.",
    precio: "$19.500",
    imagen: "/images/products/1.svg",
    etiquetas: ["Nuevo", "Grabado láser"],
    enlace: "/tienda/medalla-aurora",
  },
  {
    id: "medalla-huellas",
    nombre: "Medalla Huellas Gemelas",
    descripcion: "Juego de medallas CLA para humana y mascota con grabado personalizado en doble cara.",
    precio: "$28.900",
    imagen: "/images/products/2.svg",
    etiquetas: ["Personalizable", "Set"],
    enlace: "/tienda/medalla-huellas",
  },
  {
    id: "medalla-constelacion",
    nombre: "Medalla Constelación",
    descripcion: "Diseño circular inspirado en estrellas, grabado láser en acero quirúrgico.",
    precio: "$22.700",
    imagen: "/images/products/3.svg",
    etiquetas: ["Acero quirúrgico"],
    enlace: "/tienda/medalla-constelacion",
  },
];

export const ProductosDestacados = () => {
  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={2} textAlign="center" mb={6}>
        <Typography variant="overline" color="primary.main" letterSpacing={4}>
          Selección CLA
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          Productos destacados
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={520} mx="auto">
          Diseños pensados para vincular estilos humanos y mascotas con materiales duraderos y seguros.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {productosDestacados.map((producto) => (
          <Card key={producto.id} sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 4, overflow: "hidden" }}>
            <Box sx={{ position: "relative", height: 240 }}>
              <Image src={producto.imagen} alt={producto.nombre} fill style={{ objectFit: "cover" }} />
              <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 16, left: 16 }}>
                {producto.etiquetas.map((etiqueta) => (
                  <Chip key={etiqueta} label={etiqueta} color="primary" size="small" sx={{ bgcolor: "rgba(21, 59, 59, 0.8)", color: "common.white" }} />
                ))}
              </Stack>
            </Box>
            <CardContent sx={{ flexGrow: 1 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" fontWeight={700}>
                  {producto.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {producto.descripcion}
                </Typography>
                <Typography variant="subtitle1" color="primary.main" fontWeight={700}>
                  {producto.precio}
                </Typography>
              </Stack>
            </CardContent>
            <CardActions sx={{ px: 3, pb: 3 }}>
              <Button fullWidth variant="contained" color="primary" component={Link} href={producto.enlace}>
                Ver detalle
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
