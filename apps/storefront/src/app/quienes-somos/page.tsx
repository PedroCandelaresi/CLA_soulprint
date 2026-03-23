import { Container, Typography } from '@mui/material';

export const metadata = {
    title: 'Quiénes Somos | CLA',
    description: 'Conoce la historia detrás de CLA Joyas.',
};

export default function QuienesSomosPage() {
    return (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="overline" color="primary" fontWeight="bold">
                NUESTRA HISTORIA
            </Typography>
            <Typography variant="h2" fontWeight="700" sx={{ mt: 1, mb: 4 }}>
                Amor por los animales, Pasión por el diseño
            </Typography>
            <Typography variant="body1" fontSize="1.1rem" color="text.secondary" paragraph>
                CLA nació de una idea simple: el vínculo con nuestras mascotas es tan fuerte como cualquier lazo humano, y merece ser celebrado con la misma elegancia.
            </Typography>
            <Typography variant="body1" fontSize="1.1rem" color="text.secondary">
                Somos un equipo de artesanos y amantes de los animales dedicados a crear piezas que no solo son joyas, sino portadores de historias de amor incondicional.
            </Typography>
        </Container>
    );
}
