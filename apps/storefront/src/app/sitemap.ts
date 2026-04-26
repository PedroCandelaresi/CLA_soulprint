import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const PRODUCTS_PAGE_SIZE = 100;
const MAX_PRODUCTS_FOR_SITEMAP = 5000;
const MAX_SITEMAP_PRODUCT_PAGES = Math.ceil(MAX_PRODUCTS_FOR_SITEMAP / PRODUCTS_PAGE_SIZE);
const PRODUCTS_SITEMAP_QUERY = `
  query SitemapProducts($take: Int!, $skip: Int!) {
    products(options: { take: $take, skip: $skip }) {
      totalItems
      items {
        id
        name
        slug
      }
    }
  }
`;

type VendureProduct = {
    id: string;
    name: string;
    slug: string;
};

type VendureProductsResponse = {
    data?: {
        products?: {
            totalItems?: number;
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
    const apiUrl = process.env.VENDURE_INTERNAL_API_URL?.trim();

    if (!apiUrl) {
        console.warn('[sitemap] VENDURE_INTERNAL_API_URL is not configured');
        return [];
    }

    const products: VendureProduct[] = [];
    let totalItems: number | null = null;
    let fetchedItems = 0;
    let skip = 0;

    try {
        for (let page = 0; page < MAX_SITEMAP_PRODUCT_PAGES; page += 1) {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                cache: 'no-store',
                body: JSON.stringify({
                    query: PRODUCTS_SITEMAP_QUERY,
                    variables: {
                        take: PRODUCTS_PAGE_SIZE,
                        skip,
                    },
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

            const pageProducts = json.data?.products?.items ?? [];
            totalItems = json.data?.products?.totalItems ?? totalItems;
            console.log(
                `[sitemap] page ${page + 1}: skip=${skip}, received=${pageProducts.length}, totalItems=${totalItems ?? 'unknown'}`,
            );

            if (pageProducts.length === 0) {
                break;
            }

            fetchedItems += pageProducts.length;
            products.push(...pageProducts.filter((product) => Boolean(product.slug)));
            skip += PRODUCTS_PAGE_SIZE;

            if (totalItems != null && skip >= totalItems) {
                break;
            }
        }

        if (totalItems != null && fetchedItems < totalItems && skip >= MAX_PRODUCTS_FOR_SITEMAP) {
            console.warn(`[sitemap] Product sitemap reached safety limit of ${MAX_PRODUCTS_FOR_SITEMAP} products`);
        }

        console.log(`[sitemap] totalItems received: ${totalItems ?? 'unknown'}`);
        console.log(`[sitemap] fetched products: ${products.length}`);
        return products;
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
    const seenProductSlugs = new Set<string>();

    const productRoutes: MetadataRoute.Sitemap = products
        .filter((product) => {
            if (!product.slug || seenProductSlugs.has(product.slug)) {
                return false;
            }

            seenProductSlugs.add(product.slug);
            return true;
        })
        .map((product) => ({
            url: `${siteUrl}/productos/${product.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
        }));

    console.log(`[sitemap] product routes added: ${productRoutes.length}`);

    return [...new Map([...staticRoutes, ...productRoutes].map((route) => [route.url, route])).values()];
}
