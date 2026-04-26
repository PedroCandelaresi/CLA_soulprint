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
const PRODUCT_BRAND_NAME = 'CLA Soulprint';

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
    return cleanText(description, META_DESCRIPTION_MAX_LENGTH) || DEFAULT_DESCRIPTION;
}

function cleanText(value?: string | null, maxLength?: number): string {
    const text = (value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();

    if (!maxLength || text.length <= maxLength) {
        return text;
    }

    const truncated = text.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
    return `${truncated}...`;
}

function getProductUrl(slug: string): string {
    return absoluteUrl(`/productos/${slug}`);
}

function getPrimaryProductImage(product: Product): string {
    return normalizeImageUrl(product.featuredAsset?.preview || product.assets?.[0]?.preview);
}

function getSchemaAvailability(stockLevel?: string): string {
    return stockLevel === 'OUT_OF_STOCK'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock';
}

function formatSchemaPrice(amount: number): string {
    return (amount / 100).toFixed(2);
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => {
            if (item == null) {
                return false;
            }

            if (Array.isArray(item)) {
                return item.length > 0;
            }

            if (typeof item === 'string') {
                return item.length > 0;
            }

            return true;
        }),
    ) as Partial<T>;
}

function buildProductJsonLd(product: Product, slug: string): Record<string, unknown> {
    const primaryVariant = product.variants[0];
    const price = primaryVariant?.priceWithTax ?? primaryVariant?.price;
    const url = getProductUrl(slug);
    const category = product.collections?.find((collection) => collection.name)?.name;
    const offer =
        typeof price === 'number' && Number.isFinite(price)
            ? compactObject({
                  '@type': 'Offer',
                  price: formatSchemaPrice(price),
                  priceCurrency: primaryVariant?.currencyCode || 'ARS',
                  availability: getSchemaAvailability(primaryVariant?.stockLevel),
                  url,
              })
            : undefined;

    return compactObject({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: cleanText(product.name),
        description: cleanText(product.description) || DEFAULT_DESCRIPTION,
        image: getPrimaryProductImage(product),
        sku: primaryVariant?.sku ? cleanText(primaryVariant.sku) : undefined,
        brand: {
            '@type': 'Brand',
            name: PRODUCT_BRAND_NAME,
        },
        category: category ? cleanText(category) : undefined,
        url,
        offers: offer,
    });
}

function stringifyJsonLd(jsonLd: Record<string, unknown>): string {
    return JSON.stringify(jsonLd).replace(/</g, '\\u003c');
}

function buildProductMetadata(product: Product, slug: string): Metadata {
    const title = `${product.name || 'Producto'} | CLA Soulprint`;
    const description = cleanDescription(product.description);
    const image = getPrimaryProductImage(product);
    const url = getProductUrl(slug);

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
    const url = getProductUrl(slug);
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

    const productJsonLd = buildProductJsonLd(product, slug);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: stringifyJsonLd(productJsonLd) }}
            />
            <ProductDetail product={product} initialSearchParams={resolvedSearchParams} />
        </Container>
    );
}
