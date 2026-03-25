import { Container } from '@mui/material';
import CartPageContent from '@/components/cart/CartPageContent';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Carrito | CLA',
    description: 'Revisa y actualiza tu carrito de compras.',
};

export default function CartPage() {
    return (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
            <CartPageContent />
        </Container>
    );
}
