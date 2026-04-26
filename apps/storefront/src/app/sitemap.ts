import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/vendure";

const rawSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    const products = await listProducts({ take: 200, skip: 0 });
    const productRoutes = products
      .filter((product) => product.slug)
      .map((product) => ({
        url: absoluteUrl(`/productos/${product.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("No se pudieron incluir productos en sitemap.xml", error);
    return staticRoutes;
  }
}
