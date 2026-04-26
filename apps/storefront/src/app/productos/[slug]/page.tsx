import { getProductBySlug } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductDetail from '@/components/products/ProductDetail';
import { Container } from '@mui/material';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const DEFAULT_DESCRIPTION =
    'Storefront inspirado en CLA Soulprint para una experiencia visual mas calida, editorial y premium.';
const DEFAULT_IMAGE = '/images/products/placeholder.png';
const META_DESCRIPTION_MAX_LENGTH = 155;

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams?:
        | Promise<{ [key: string]: string | string[] | undefined }>
        | { [key: string]: string | string[] | undefined };
}

function getSiteUrl(): string {
    const rawSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
        return new URL(rawSiteUrl).origin;
    } catch {
        return 'http://localhost:3000';
    }
}

function absoluteUrl(path: string): string {
    return new URL(path, getSiteUrl()).toString();
}

function normalizeImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) {
        return absoluteUrl(DEFAULT_IMAGE);
    }

    try {
        return new URL(imageUrl).toString();
    } catch {
        return absoluteUrl(imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`);
    }
}

function cleanDescription(description?: string | null): string {
    const text = (description || DEFAULT_DESCRIPTION)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length <= META_DESCRIPTION_MAX_LENGTH) {
        return text;
    }

    const truncated = text.slice(0, META_DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, '').trim();
    return `${truncated}...`;
}

function buildProductMetadata(product: Product, slug: string): Metadata {
    const title = `${product.name || 'Producto'} | CLA Soulprint`;
    const description = cleanDescription(product.description);
    const image = normalizeImageUrl(product.featuredAsset?.preview || product.assets?.[0]?.preview);
    const url = absoluteUrl(`/productos/${slug}`);

    return {
        title,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            images: [
                {
                    url: image,
                    alt: product.name || 'Producto CLA Soulprint',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
    };
}

function buildProductNotFoundMetadata(slug: string): Metadata {
    const title = 'Producto no encontrado | CLA Soulprint';
    const description = 'El producto solicitado no esta disponible en CLA Soulprint.';
    const url = absoluteUrl(`/productos/${slug}`);
    const image = absoluteUrl(DEFAULT_IMAGE);

    return {
        title,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            images: [
                {
                    url: image,
                    alt: 'Producto no encontrado',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
        robots: {
            index: false,
            follow: true,
        },
    };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    if (!slug) {
        return buildProductNotFoundMetadata('producto');
    }

    try {
        const product = await getProductBySlug(slug);

        if (!product) {
            return buildProductNotFoundMetadata(slug);
        }

        return buildProductMetadata(product, slug);
    } catch (error) {
        console.error('Error generating product metadata', error);
        return buildProductNotFoundMetadata(slug);
    }
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
