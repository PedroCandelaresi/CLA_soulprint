import { getProductBySlug } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductDetail from '@/components/products/ProductDetail';
import { Container } from '@mui/material';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps) {
    const { slug } = await params;
    if (!slug) {
        notFound();
    }

    let product: Product | null = null;

    try {
        product = await getProductBySlug(slug);
    } catch (error) {
        console.error('Error fetching product', error);
    }

    if (!product) {
        notFound();
    }

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            <ProductDetail product={product} />
        </Container>
    );
}
