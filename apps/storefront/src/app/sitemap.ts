import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

type VendureProduct = {
    id: string;
    name: string;
    slug: string;
};

type VendureProductsResponse = {
    data?: {
        products?: {
            items?: VendureProduct[];
        };
    };
    errors?: unknown;
};

function getSiteUrl(): string {
    return (
        process.env.SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'http://localhost:3000'
    ).replace(/\/$/, '');
}

async function getSitemapProducts(): Promise<VendureProduct[]> {
    const apiUrl = process.env.VENDURE_INTERNAL_API_URL;

    if (!apiUrl) {
        console.warn('[sitemap] VENDURE_INTERNAL_API_URL is not configured');
        return [];
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            cache: 'no-store',
            body: JSON.stringify({
                query: `
          query SitemapProducts {
            products(options: { take: 200 }) {
              items {
                id
                name
                slug
              }
            }
          }
        `,
            }),
        });

        if (!response.ok) {
            console.warn('[sitemap] Vendure request failed:', response.status);
            return [];
        }

        const json = (await response.json()) as VendureProductsResponse;

        if (json.errors) {
            console.warn('[sitemap] Vendure GraphQL errors:', JSON.stringify(json.errors));
            return [];
        }

        return json.data?.products?.items?.filter((product) => Boolean(product.slug)) ?? [];
    } catch (error) {
        console.warn('[sitemap] Could not fetch products:', error);
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = getSiteUrl();
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${siteUrl}/productos`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/destacados`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${siteUrl}/como-comprar`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${siteUrl}/sobre-nosotros`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
    ];

    const products = await getSitemapProducts();

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${siteUrl}/productos/${product.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes];
}
