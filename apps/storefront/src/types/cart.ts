import type { ProductAsset } from './product';

export interface CartLineProduct {
    name: string;
    slug?: string;
}

export interface CartLineVariant {
    id: string;
    name: string;
    stockLevel?: string;
    product: CartLineProduct;
}

export interface CartLine {
    id: string;
    quantity: number;
    unitPriceWithTax: number;
    linePriceWithTax: number;
    featuredAsset?: ProductAsset;
    productVariant: CartLineVariant;
}

export interface Cart {
    id: string;
    code: string;
    state: string;
    currencyCode: string;
    totalQuantity: number;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    lines: CartLine[];
}
