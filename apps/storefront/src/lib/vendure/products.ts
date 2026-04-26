import { fetchVendure } from './client';
import type { Product } from '@/types/product';

interface PaginationOptions {
    take?: number;
    skip?: number;
}

interface ProductsResult {
    items: Product[];
    totalItems: number;
}

interface ProductBadgeLookupResult {
    items: Array<Pick<Product, 'id' | 'customFields' | 'collections' | 'facetValues'>>;
}

interface CollectionResult {
    items: CollectionItem[];
}

interface SearchResult {
    items: SearchProductItem[];
    totalItems: number;
}

interface SearchPriceRange {
    min: number;
    max: number;
}

interface SearchSinglePrice {
    value: number;
}

interface SearchProductItem {
    productId: string;
    productName: string;
    slug: string;
    description: string;
    productAsset?: {
        preview: string;
    };
    productVariantId?: string;
    productVariantName?: string;
    productVariantAsset?: {
        preview: string;
    };
    price: SearchPriceRange | SearchSinglePrice;
    priceWithTax: SearchPriceRange | SearchSinglePrice;
    currencyCode: string;
}

const ASSET_FIELDS = `
    preview
    source
`;

const BADGE_FIELDS = `
    id
    name
    code
    enabled
    priority
    backgroundColor
    textColor
    expiresAt
    featuredAssetId
    featuredAsset {
        ${ASSET_FIELDS}
    }
    renderedSvg
`;

const PRODUCT_BADGE_CUSTOM_FIELDS = `
    customFields {
        badges {
            ${BADGE_FIELDS}
        }
    }
`;

const PRODUCT_COLLECTION_BADGE_FIELDS = `
    collections {
        id
        name
        slug
        customFields {
            badges {
                ${BADGE_FIELDS}
            }
        }
    }
`;

interface FacetValue {
    id: string;
    code: string;
    name: string;
}

interface Facet {
    id: string;
    code: string;
    name: string;
    values: FacetValue[];
}

interface FacetsResult {
    items: Facet[];
}

export interface CollectionItem {
    id: string;
    name: string;
    slug: string;
}

const GET_PRODUCTS_QUERY = `
  query GetProducts($take: Int, $skip: Int) {
    products(options: { take: $take, skip: $skip }) {
      totalItems
      items {
        id
        name
        slug
        description
        facetValues {
          id
          code
          name
        }
        featuredAsset {
            ${ASSET_FIELDS}
        }
        assets {
          ${ASSET_FIELDS}
        }
        ${PRODUCT_BADGE_CUSTOM_FIELDS}
        ${PRODUCT_COLLECTION_BADGE_FIELDS}
        variants {
          price
          currencyCode
        }
      }
    }
  }
`;

const GET_PRODUCTS_BY_COLLECTION_QUERY = `
  query GetProductsByCollection($collectionSlug: String!, $take: Int, $skip: Int) {
    search(input: { collectionSlug: $collectionSlug, take: $take, skip: $skip, groupByProduct: true }) {
      totalItems
      items {
        productId
        productName
        slug
        description
        productAsset { ${ASSET_FIELDS} }
        productVariantAsset { ${ASSET_FIELDS} }
        price {
          ... on PriceRange { min max }
          ... on SinglePrice { value }
        }
        priceWithTax {
          ... on PriceRange { min max }
          ... on SinglePrice { value }
        }
        currencyCode
      }
    }
  }
`;

const GET_PRODUCT_QUERY = `
    query GetProduct($slug: String!) {
        product(slug: $slug) {
            id
            name
            slug
            description
            featuredAsset {
                ${ASSET_FIELDS}
            }
            assets {
                ${ASSET_FIELDS}
            }
            ${PRODUCT_BADGE_CUSTOM_FIELDS}
            ${PRODUCT_COLLECTION_BADGE_FIELDS}
            optionGroups {
                id
                code
                name
                options {
                    id
                    code
                    name
                    groupId
                }
            }
            variants {
                id
                name
                sku
                price
                priceWithTax
                currencyCode
                stockLevel
                featuredAsset {
                    ${ASSET_FIELDS}
                }
                assets {
                    ${ASSET_FIELDS}
                }
                options {
                    id
                    code
                    name
                    groupId
                }
                customFields {
                    badges {
                        ${BADGE_FIELDS}
                    }
                }
            }
        }
    }
`;

const GET_PRODUCTS_BADGES_BY_IDS_QUERY = `
    query GetProductsBadgesByIds($ids: [String!]!, $take: Int!) {
        products(options: { take: $take, filter: { id: { in: $ids } } }) {
            items {
                id
                facetValues {
                    id
                    code
                    name
                }
                ${PRODUCT_BADGE_CUSTOM_FIELDS}
                ${PRODUCT_COLLECTION_BADGE_FIELDS}
            }
        }
    }
`;

const GET_COLLECTIONS_QUERY = `
    query GetCollections {
        collections(options: { topLevelOnly: true }) {
            items {
                id
                name
                slug
                parent {
                    name
                }
                featuredAsset {
                    preview
                }
            }
        }
    }
`;

const GET_FACETS_QUERY = `
    query GetFacets {
        facets {
            items {
                id
                code
                name
                values {
                    id
                    code
                    name
                }
            }
        }
    }
`;

const SEARCH_PRODUCTS_QUERY = `
    query SearchProducts($input: SearchInput!) {
        search(input: $input) {
            totalItems
            items {
                productId
                productName
                slug
                description
                productVariantId
                productVariantName
                productVariantAsset {
                    preview
                }
                price {
                    ... on PriceRange {
                        min
                        max
                    }
                    ... on SinglePrice {
                        value
                    }
                }
                priceWithTax {
                    ... on PriceRange {
                        min
                        max
                    }
                    ... on SinglePrice {
                        value
                    }
                }
                currencyCode
                productAsset {
                    preview
                }
            }
        }
    }
`;

function mapSearchProduct(item: SearchProductItem): Product {
    return {
        id: item.productId,
        name: item.productName,
        slug: item.slug,
        description: item.description,
        featuredAsset: item.productAsset ?? item.productVariantAsset,
        variants: [{
            id: item.productVariantId,
            name: item.productVariantName,
            price: 'value' in item.price ? item.price.value : item.price.min,
            priceWithTax: 'value' in item.priceWithTax ? item.priceWithTax.value : item.priceWithTax.min,
            currencyCode: item.currencyCode,
            featuredAsset: item.productVariantAsset,
        }],
    };
}

function normalizeSlug(value: string): string {
    return value.trim().toLowerCase();
}

function productMatchesCollectionOrFacet(product: Product, collectionSlug: string): boolean {
    const normalizedSlug = normalizeSlug(collectionSlug);

    return Boolean(
        product.collections?.some((collection) => normalizeSlug(collection.slug ?? '') === normalizedSlug) ||
        product.facetValues?.some((facetValue) => normalizeSlug(facetValue.code) === normalizedSlug),
    );
}

async function enrichProductsWithBadges(products: Product[]): Promise<Product[]> {
    const productIds = Array.from(new Set(products.map((product) => product.id).filter(Boolean)));

    if (productIds.length === 0) {
        return products;
    }

    try {
        const data = await fetchVendure<{ products: ProductBadgeLookupResult }>(GET_PRODUCTS_BADGES_BY_IDS_QUERY, {
            ids: productIds,
            take: productIds.length,
        });
        const productDataMap = new Map(
            data.products.items.map((product) => [product.id, product]),
        );

        return products.map((product) => {
            const enriched = productDataMap.get(product.id);

            if (!enriched) {
                return product;
            }

            return {
                ...product,
                customFields: {
                    ...(product.customFields ?? {}),
                    badges: enriched.customFields?.badges ?? [],
                },
                collections: enriched.collections,
                facetValues: enriched.facetValues ?? product.facetValues,
            };
        });
    } catch (error) {
        console.warn('No se pudieron enriquecer badges para resultados provenientes de search.', error);
        return products;
    }
}

export async function listProducts(options: PaginationOptions = {}): Promise<Product[]> {
    const { take = 24, skip = 0 } = options;
    const data = await fetchVendure<{ products: ProductsResult }>(GET_PRODUCTS_QUERY, { take, skip });
    return data.products.items;
}

export async function listCollections(): Promise<CollectionItem[]> {
    const data = await fetchVendure<{ collections: CollectionResult }>(GET_COLLECTIONS_QUERY);
    return data.collections.items;
}

export async function listProductsByCollection(collectionSlug: string, options: PaginationOptions = {}): Promise<Product[]> {
    const { take = 24, skip = 0 } = options;
    const normalizedSlug = normalizeSlug(collectionSlug);

    try {
        const data = await fetchVendure<{ search: SearchResult }>(GET_PRODUCTS_BY_COLLECTION_QUERY, {
            collectionSlug: normalizedSlug,
            take: Math.max(take + skip, take),
            skip: 0,
        });
        const products = await enrichProductsWithBadges(data.search.items.map(mapSearchProduct));
        const filtered = products.filter((product) => productMatchesCollectionOrFacet(product, normalizedSlug));

        if (filtered.length > 0) {
            return filtered.slice(skip, skip + take);
        }
    } catch (error) {
        console.warn('listProductsByCollection: search collectionSlug failed', error);
    }

    try {
        const facetsData = await fetchVendure<{ facets: FacetsResult }>(GET_FACETS_QUERY);
        const facetValue = facetsData.facets.items
            .flatMap((facet) => facet.values)
            .find((value) => normalizeSlug(value.code) === normalizedSlug);

        if (facetValue) {
            const searchData = await fetchVendure<{ search: SearchResult }>(SEARCH_PRODUCTS_QUERY, {
                input: {
                    facetValueIds: [facetValue.id],
                    groupByProduct: true,
                    take: Math.max(take + skip, take),
                    skip: 0,
                },
            });
            const products = await enrichProductsWithBadges(searchData.search.items.map(mapSearchProduct));
            const filtered = products.filter((product) => productMatchesCollectionOrFacet(product, normalizedSlug));

            if (filtered.length > 0) {
                return filtered.slice(skip, skip + take);
            }
        }
    } catch (error) {
        console.warn('listProductsByCollection: facet fallback failed', error);
    }

    const pageSize = 100;
    const maxProductsToInspect = 2000;
    const matched: Product[] = [];
    let fetched = 0;

    while (fetched < maxProductsToInspect && matched.length < skip + take) {
        const data = await fetchVendure<{ products: ProductsResult }>(GET_PRODUCTS_QUERY, {
            take: pageSize,
            skip: fetched,
        });
        const items = data.products.items;

        if (items.length === 0) {
            break;
        }

        matched.push(...items.filter((product) => productMatchesCollectionOrFacet(product, normalizedSlug)));
        fetched += items.length;

        if (fetched >= data.products.totalItems) {
            break;
        }
    }

    return matched.slice(skip, skip + take);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const data = await fetchVendure<{ product: Product | null }>(GET_PRODUCT_QUERY, { slug });
    return data.product;
}

/**
 * Busca productos que tengan la etiqueta (facet value) con code "destacado".
 * En el admin de Vendure: Catálogo → Facetas → crear faceta con value code "destacado".
 * Se puede asignar a productos de cualquier colección.
 */
export async function getFeaturedProducts(options: PaginationOptions = {}): Promise<Product[]> {
    const { take = 12, skip = 0 } = options;

    try {
        // 1. Obtener todas las facetas para encontrar el ID del valor "destacado"
        const facetsData = await fetchVendure<{ facets: FacetsResult }>(GET_FACETS_QUERY);

        let destacadoFacetValueId: string | null = null;
        for (const facet of facetsData.facets.items) {
            const match = facet.values.find(
                (v) => v.code === 'destacado' || v.name.toLowerCase() === 'destacado'
            );
            if (match) {
                destacadoFacetValueId = match.id;
                break;
            }
        }

        if (!destacadoFacetValueId) return [];

        // 2. Buscar productos con ese facet value ID
        const searchData = await fetchVendure<{ search: SearchResult }>(SEARCH_PRODUCTS_QUERY, {
            input: {
                facetValueIds: [destacadoFacetValueId],
                groupByProduct: true,
                take,
                skip,
            },
        });

        const featuredProducts = await enrichProductsWithBadges(searchData.search.items.map(mapSearchProduct));
        if (featuredProducts.length > 0) {
            return featuredProducts;
        }

        const fallbackTake = Math.max(skip + take + 24, 48);
        const productsData = await fetchVendure<{ products: ProductsResult }>(GET_PRODUCTS_QUERY, {
            take: fallbackTake,
            skip: 0,
        });

        return productsData.products.items
            .filter((product) =>
                product.facetValues?.some(
                    (facetValue) =>
                        facetValue.id === destacadoFacetValueId ||
                        facetValue.code === 'destacado' ||
                        facetValue.name.toLowerCase() === 'destacado',
                ),
            )
            .slice(skip, skip + take);
    } catch (error) {
        console.warn('getFeaturedProducts: no se pudieron obtener productos destacados', error);
        return [];
    }
}
