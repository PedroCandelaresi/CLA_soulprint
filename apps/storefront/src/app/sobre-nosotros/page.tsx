import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import BrandLogo from '@/components/branding/BrandLogo';

export const metadata = {
    title: 'Sobre Nosotros | CLA Soulprint',
    description: 'Conocé la identidad, la historia y los valores humanos que sostienen la estética de CLA Soulprint.',
};

const valueCards = [
    {
        title: 'Trabajo con dignidad',
        description:
            'Creemos en el esfuerzo bien hecho, en el oficio cuidado y en el valor de cada persona que hace posible que un producto llegue a destino en condiciones justas y humanas.',
    },
    {
        title: 'Familia y comunidad',
        description:
            'Nos gusta pensar la tienda como una red de vínculos reales: clientes, equipos, proveedores y hogares conectados por algo simple pero profundo, que es cuidarnos entre todos.',
    },
    {
        title: 'Igualdad y cercanía',
        description:
            'Buscamos una experiencia clara, amable y accesible, donde nadie quede afuera por tecnicismos, distancia o falta de información. La calidad también está en el trato.',
    },
    {
        title: 'Justicia social en lo cotidiano',
        description:
            'Defendemos una idea concreta de comercio: precios razonables, respeto por el trabajo, consumo con sentido y decisiones que pongan a las personas por encima de la especulación.',
    },
];

export default function SobreNosotrosPage() {
    return (
        <Box sx={{ py: { xs: 7, md: 10 }, bgcolor: '#faf7f2' }}>
            <Container maxWidth="lg">
                <Stack spacing={8}>
                    <Box
                        sx={{
                            px: { xs: 3, md: 6 },
                            py: { xs: 5, md: 8 },
                            borderRadius: 5,
                            border: '1px solid rgba(124, 92, 67, 0.16)',
                            background:
                                'linear-gradient(135deg, rgba(255,250,243,1) 0%, rgba(248,237,221,1) 48%, rgba(240,226,204,1) 100%)',
                            boxShadow: '0 24px 50px rgba(129, 103, 80, 0.12)',
                        }}
                    >
                        <Stack spacing={3} alignItems="center" textAlign="center">
                            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
                                NUESTRA IDENTIDAD
                            </Typography>
                            <Box
                                sx={{
                                    width: '100%',
                                    maxWidth: { xs: 300, sm: 440, md: 600 },
                                    // El bloque verde del logo → tono arena/crema oscurecida
                                    // para que el grabado sea legible pero se funda con el fondo
                                    '--brand-logo-bg': 'rgba(178, 145, 95, 0.42)',
                                    // Las letras blancas → reflejan el mismo tono cálido
                                    '--brand-logo-fg': 'rgba(225, 200, 155, 0.55)',
                                    '& svg': {
                                        // Efecto grabado/troquel:
                                        // – sombra NÍTIDA (blur=0) abajo-derecha: el hueco proyecta sombra
                                        // – reflejo NÍTIDO arriba-izquierda: la luz incide en el borde del corte
                                        filter: [
                                            'drop-shadow(-2px -2.5px 0px rgba(255, 253, 246, 0.96))',
                                            'drop-shadow(2.5px 3px 0px rgba(115, 78, 22, 0.28))',
                                        ].join(' '),
                                    },
                                }}
                            >
                                <BrandLogo label="CLA Soulprint" />
                            </Box>
                            <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{ maxWidth: 900, lineHeight: 1.35 }}
                            >
                                Una marca pensada desde el encuentro entre calidad, cercanía humana y una idea de
                                comercio más justo, más cálido y más comprometido con la vida real.
                            </Typography>
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ maxWidth: 840, lineHeight: 1.9, fontSize: '1.08rem' }}
                            >
                                CLA Soulprint nace con una convicción muy concreta: detrás de cada compra hay personas,
                                hogares, trabajo, afectos y expectativas. Por eso elegimos construir una tienda donde
                                la estética importe, sí, pero donde también importen la dignidad del trabajo, el
                                cuidado de los vínculos y el derecho a acceder a piezas nobles, bien hechas y
                                ofrecidas con honestidad.
                            </Typography>
                        </Stack>
                    </Box>

                    <Grid container spacing={3}>
                        {valueCards.map((card) => (
                            <Grid key={card.title} size={{ xs: 12, sm: 6 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        p: { xs: 3, md: 4 },
                                        borderRadius: 4,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        backgroundColor: 'common.white',
                                    }}
                                >
                                    <Stack spacing={1.5}>
                                        <Typography variant="h5" fontWeight={700}>
                                            {card.title}
                                        </Typography>
                                        <Typography color="text.secondary" sx={{ lineHeight: 1.85 }}>
                                            {card.description}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3.5, md: 5 },
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: 'divider',
                            backgroundColor: '#fffdf9',
                        }}
                    >
                        <Stack spacing={2.5}>
                            <Typography variant="h4" fontWeight={700}>
                                La empresa que queremos ser
                            </Typography>
                            <Typography color="text.secondary" sx={{ lineHeight: 1.95, fontSize: '1.05rem' }}>
                                Queremos crecer sin perder la ternura comercial, sin desentendernos de quién produce,
                                quién vende, quién envía y quién recibe. Nos inspira una ética donde el trabajo valga,
                                la familia esté en el centro, la igualdad no sea un discurso vacío y la justicia
                                social se juegue también en los detalles cotidianos: en el precio, en el trato, en el
                                tiempo de respuesta y en la confianza que una marca construye cuando cumple.
                            </Typography>
                            <Typography color="text.secondary" sx={{ lineHeight: 1.95, fontSize: '1.05rem' }}>
                                Más que una tienda, buscamos ser una casa comercial con sensibilidad humana. Una marca
                                con estilo, sí, pero también con conciencia. Una experiencia que no se limite a vender
                                cosas, sino que haga sentir a cada persona del otro lado que acá hay respeto, escucha y
                                vocación de servicio de verdad.
                            </Typography>
                        </Stack>
                    </Paper>
                </Stack>
            </Container>
        </Box>
    );
}
