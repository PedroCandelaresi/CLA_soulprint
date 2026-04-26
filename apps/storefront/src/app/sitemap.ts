import type { MetadataRoute } from "next";

const rawSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const PRODUCTS_SITEMAP_QUERY = `
  query SitemapProducts($take: Int!, $skip: Int!) {
    products(options: { take: $take, skip: $skip }) {
      items {
        slug
      }
    }
  }
`;

interface SitemapProduct {
  slug?: string | null;
}

interface SitemapProductsResponse {
  data?: {
    products?: {
      items?: SitemapProduct[];
    };
  };
  errors?: Array<{ message?: string }>;
}

export const revalidate = 3600;

function getSiteUrl(): string {
  try {
    return new URL(rawSiteUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

function getVendureInternalApiUrl(): string | null {
  const value = process.env.VENDURE_INTERNAL_API_URL?.trim();
  return value || null;
}

async function listSitemapProducts(): Promise<SitemapProduct[]> {
  const vendureApiUrl = getVendureInternalApiUrl();

  if (!vendureApiUrl) {
    console.warn("sitemap.xml: VENDURE_INTERNAL_API_URL no está configurado; se omiten productos.");
    return [];
  }

  const response = await fetch(vendureApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: PRODUCTS_SITEMAP_QUERY,
      variables: {
        take: 200,
        skip: 0,
      },
    }),
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Vendure sitemap query failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as SitemapProductsResponse;

  if (payload.errors?.length) {
    throw new Error(`Vendure sitemap GraphQL error: ${payload.errors[0]?.message || "unknown error"}`);
  }

  return payload.data?.products?.items ?? [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/productos"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/destacados"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/como-comprar"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/sobre-nosotros"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  try {
    const products = await listSitemapProducts();
    const productRoutes = products
      .filter((product) => product.slug)
      .map((product) => ({
        url: absoluteUrl(`/productos/${product.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...new Map([...staticRoutes, ...productRoutes].map((route) => [route.url, route])).values()];
  } catch (error) {
    console.warn("sitemap.xml: no se pudieron incluir productos; se devuelven rutas estáticas.", error);
    return staticRoutes;
  }
}
