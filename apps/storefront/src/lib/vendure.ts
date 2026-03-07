
const VENDURE_API_URL = process.env.VENDURE_INTERNAL_API_URL || process.env.NEXT_PUBLIC_VENDURE_API_URL || 'http://localhost:3001/shop-api';

interface GraphQLResponse<T> {
    data: T;
    errors?: any[];
}

export async function fetchVendure<T>(query: string, variables: any = {}): Promise<T> {
    console.log('Fetching from Vendure:', VENDURE_API_URL);
    try {
        const res = await fetch(VENDURE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Vendure API error: ${res.statusText}`);
        }

        const json: GraphQLResponse<T> = await res.json();
        if (json.errors) {
            console.error('Vendure GraphQL Errors:', json.errors);
            throw new Error(json.errors[0].message);
        }

        return json.data;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}

export const GET_PRODUCTS_QUERY = `
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
          price
          currencyCode
        }
      }
    }
  }
`;

export const GET_PRODUCTS_BY_COLLECTION_QUERY = `
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
        variants { price currencyCode }
      }
    }
  }
`;

export const GET_PRODUCT_QUERY = `
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

export const GET_COLLECTIONS_QUERY = `
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

export const SEARCH_PRODUCTS_QUERY = `
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
