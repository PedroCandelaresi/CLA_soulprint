import { fetchVendure } from './client';
import type { Product } from '@/types/product';

interface PaginationOptions {
    take?: number;
    skip?: number;
}

interface ProductsResult {
    items: Product[];
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
    price: SearchPriceRange | SearchSinglePrice;
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
        featuredAsset {
            preview
        }
        assets {
          preview
        }
        variants {
          id
          name
          price
          currencyCode
          stockLevel
        }
      }
    }
  }
`;

const GET_PRODUCTS_BY_COLLECTION_QUERY = `
  query GetProductsByCollection($collectionSlug: String!, $take: Int, $skip: Int) {
    products(options: { take: $take, skip: $skip, filter: { collections: { slug: { eq: $collectionSlug } } } }) {
      totalItems
      items {
        id
        name
        slug
        description
        featuredAsset { preview }
        assets { preview }
        variants {
          id
          name
          price
          currencyCode
          stockLevel
        }
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
                preview
            }
            assets {
                preview
            }
            variants {
                id
                name
                price
                currencyCode
                stockLevel
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

const SEARCH_PRODUCTS_QUERY = `
    query SearchProducts($input: SearchInput!) {
        search(input: $input) {
            totalItems
            items {
                productId
                productName
                slug
                description
                price {
                    ... on PriceRange {
                        min
                        max
                    }
                    ... on SinglePrice {
                        value
                    }
                }
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
        featuredAsset: item.productAsset,
        variants: [{
            id: undefined,
            name: undefined,
            price: 'value' in item.price ? item.price.value : item.price.min,
            currencyCode: 'ARS',
            stockLevel: undefined,
        }],
    };
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

    try {
        const data = await fetchVendure<{ products: ProductsResult }>(GET_PRODUCTS_BY_COLLECTION_QUERY, {
            collectionSlug,
            take,
            skip,
        });
        return data.products.items;
    } catch (error) {
        console.warn('Fallback to search API for collection', error);
        const input = { take, skip, groupByProduct: true, collectionSlug };
        const searchData = await fetchVendure<{ search: SearchResult }>(SEARCH_PRODUCTS_QUERY, { input });
        return searchData.search.items.map(mapSearchProduct);
    }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const data = await fetchVendure<{ product: Product | null }>(GET_PRODUCT_QUERY, { slug });
    return data.product;
}
