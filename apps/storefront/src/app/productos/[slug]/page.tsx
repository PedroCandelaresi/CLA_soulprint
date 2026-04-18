import { getProductBySlug } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductDetail from '@/components/products/ProductDetail';
import { Container } from '@mui/material';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams?:
        | Promise<{ [key: string]: string | string[] | undefined }>
        | { [key: string]: string | string[] | undefined };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
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
            <ProductDetail product={product} initialSearchParams={resolvedSearchParams} />
        </Container>
    );
}
