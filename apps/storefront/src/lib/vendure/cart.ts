import type { Cart } from '@/types/cart';
import { appendVendureSetCookieHeaders, fetchVendureApi } from './client';

const ACTIVE_ORDER_FRAGMENT = `
  fragment ActiveOrderFields on Order {
    __typename
    id
    code
    state
    currencyCode
    totalQuantity
    subTotalWithTax
    shippingWithTax
    totalWithTax
    lines {
      id
      quantity
      unitPriceWithTax
      linePriceWithTax
      featuredAsset {
        preview
      }
      productVariant {
        id
        name
        stockLevel
        product {
          name
          slug
        }
      }
    }
  }
`;

const GET_ACTIVE_ORDER_QUERY = `
  query GetActiveOrder {
    activeOrder {
      ...ActiveOrderFields
    }
  }
  ${ACTIVE_ORDER_FRAGMENT}
`;

const ADD_ITEM_TO_ORDER_MUTATION = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      __typename
      ...ActiveOrderFields
      ... on ErrorResult {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
        quantityAvailable
        order {
          ...ActiveOrderFields
        }
      }
    }
  }
  ${ACTIVE_ORDER_FRAGMENT}
`;

const ADJUST_ORDER_LINE_MUTATION = `
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      __typename
      ...ActiveOrderFields
      ... on ErrorResult {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
        quantityAvailable
        order {
          ...ActiveOrderFields
        }
      }
    }
  }
  ${ACTIVE_ORDER_FRAGMENT}
`;

const REMOVE_ORDER_LINE_MUTATION = `
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      __typename
      ...ActiveOrderFields
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
  ${ACTIVE_ORDER_FRAGMENT}
`;

interface VendureAsset {
    preview: string;
}

interface VendureOrderLine {
    id: string;
    quantity: number;
    unitPriceWithTax: number;
    linePriceWithTax: number;
    featuredAsset?: VendureAsset | null;
    productVariant: {
        id: string;
        name: string;
        stockLevel?: string | null;
        product?: {
            name: string;
            slug: string;
        } | null;
    };
}

interface VendureOrder {
    __typename: 'Order';
    id: string;
    code: string;
    state: string;
    currencyCode: string;
    totalQuantity: number;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    lines: VendureOrderLine[];
}

interface VendureErrorResult {
    __typename: string;
    errorCode?: string;
    message: string;
    quantityAvailable?: number;
    order?: VendureOrder | null;
}

interface ActiveOrderResponse {
    activeOrder: VendureOrder | null;
}

interface AddItemToOrderResponse {
    addItemToOrder: VendureOrder | VendureErrorResult;
}

interface AdjustOrderLineResponse {
    adjustOrderLine: VendureOrder | VendureErrorResult;
}

interface RemoveOrderLineResponse {
    removeOrderLine: VendureOrder | VendureErrorResult;
}

export interface CartOperationResult {
    cart: Cart | null;
    error?: string;
    headers: Headers;
}

function buildVendureHeaders(cookieHeader?: string): HeadersInit | undefined {
    if (!cookieHeader) {
        return undefined;
    }

    return {
        cookie: cookieHeader,
    };
}

function mapOrderToCart(order: VendureOrder): Cart {
    return {
        id: order.id,
        code: order.code,
        state: order.state,
        currencyCode: order.currencyCode,
        totalQuantity: order.totalQuantity,
        subTotalWithTax: order.subTotalWithTax,
        shippingWithTax: order.shippingWithTax,
        totalWithTax: order.totalWithTax,
        lines: order.lines.map((line) => ({
            id: line.id,
            quantity: line.quantity,
            unitPriceWithTax: line.unitPriceWithTax,
            linePriceWithTax: line.linePriceWithTax,
            featuredAsset: line.featuredAsset ? { preview: line.featuredAsset.preview } : undefined,
            productVariant: {
                id: line.productVariant.id,
                name: line.productVariant.name,
                stockLevel: line.productVariant.stockLevel || undefined,
                product: {
                    name: line.productVariant.product?.name || line.productVariant.name,
                    slug: line.productVariant.product?.slug,
                },
            },
        })),
    };
}

function isVendureOrder(result: VendureOrder | VendureErrorResult): result is VendureOrder {
    return result.__typename === 'Order';
}

function buildResultError(result: VendureErrorResult): string {
    if (result.__typename === 'InsufficientStockError' && typeof result.quantityAvailable === 'number') {
        return `${result.message} Disponible: ${result.quantityAvailable}.`;
    }

    return result.message || 'No se pudo actualizar el carrito.';
}

function mapMutationResult(result: VendureOrder | VendureErrorResult): Pick<CartOperationResult, 'cart' | 'error'> {
    if (isVendureOrder(result)) {
        return {
            cart: mapOrderToCart(result),
        };
    }

    return {
        cart: result.order ? mapOrderToCart(result.order) : null,
        error: buildResultError(result),
    };
}

export async function getActiveOrder(cookieHeader?: string): Promise<CartOperationResult> {
    const { data, headers } = await fetchVendureApi<ActiveOrderResponse>(GET_ACTIVE_ORDER_QUERY, {
        headers: buildVendureHeaders(cookieHeader),
    });

    return {
        cart: data.activeOrder ? mapOrderToCart(data.activeOrder) : null,
        headers,
    };
}

export async function addItemToOrder(cookieHeader: string | undefined, productVariantId: string, quantity: number): Promise<CartOperationResult> {
    const { data, headers } = await fetchVendureApi<AddItemToOrderResponse>(ADD_ITEM_TO_ORDER_MUTATION, {
        headers: buildVendureHeaders(cookieHeader),
        variables: {
            productVariantId,
            quantity,
        },
    });

    return {
        ...mapMutationResult(data.addItemToOrder),
        headers,
    };
}

export async function adjustOrderLine(cookieHeader: string | undefined, orderLineId: string, quantity: number): Promise<CartOperationResult> {
    const { data, headers } = await fetchVendureApi<AdjustOrderLineResponse>(ADJUST_ORDER_LINE_MUTATION, {
        headers: buildVendureHeaders(cookieHeader),
        variables: {
            orderLineId,
            quantity,
        },
    });

    return {
        ...mapMutationResult(data.adjustOrderLine),
        headers,
    };
}

export async function removeOrderLine(cookieHeader: string | undefined, orderLineId: string): Promise<CartOperationResult> {
    const { data, headers } = await fetchVendureApi<RemoveOrderLineResponse>(REMOVE_ORDER_LINE_MUTATION, {
        headers: buildVendureHeaders(cookieHeader),
        variables: {
            orderLineId,
        },
    });

    return {
        ...mapMutationResult(data.removeOrderLine),
        headers,
    };
}

export { appendVendureSetCookieHeaders };
