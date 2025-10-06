import PageContainer from '@/app/components/container/PageContainer';
import Footer from '@/app/components/frontend-pages/shared/footer';
import ScrollToTop from '@/app/components/frontend-pages/shared/scroll-to-top';
import { EncabezadoPrincipal } from '@/features/homepage/componentes/EncabezadoPrincipal';
import { CarruselDestacado } from '@/features/homepage/componentes/CarruselDestacado';
import { ProductosDestacados } from '@/features/homepage/componentes/ProductosDestacados';
import { Box } from '@mui/material';

const PaginaInicio = () => {
  return (
    <PageContainer title="Inicio" description="Accesorios de joyería CLA para humanos y mascotas">
      <EncabezadoPrincipal />
      <CarruselDestacado />
      <Box component="section" sx={{ px: { xs: 2, md: 6 } }}>
        <ProductosDestacados />
      </Box>
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default PaginaInicio;
