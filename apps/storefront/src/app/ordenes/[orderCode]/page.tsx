import { Container, Stack, Typography } from '@mui/material';
import OrderPersonalizationCard from '@/components/personalization/OrderPersonalizationCard';

interface OrderPageProps {
    params: Promise<{ orderCode: string }>;
    searchParams: Promise<{ token?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function OrderPersonalizationPage({ params, searchParams }: OrderPageProps) {
    const { orderCode } = await params;
    const { token } = await searchParams;

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
            <Stack spacing={3}>
                <div>
                    <Typography variant="h3" fontWeight={700} gutterBottom>
                        Personalización del pedido
                    </Typography>
                    <Typography color="text.secondary">
                        Podés volver a esta pantalla para subir o reemplazar la foto de tu pedido.
                    </Typography>
                </div>

                <OrderPersonalizationCard
                    orderCode={orderCode}
                    initialAccessToken={token || null}
                    title="Foto o archivo para fabricar tu producto"
                />
            </Stack>
        </Container>
    );
}
