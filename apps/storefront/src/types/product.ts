export interface ProductVariant {
    id?: string;
    name?: string;
    price: number;
    currencyCode: string;
    stockLevel?: string;
}

export interface ProductAsset {
    preview: string;
}

export interface Product {
    id: string;
    productId?: string;
    name: string;
    slug: string;
    description: string;
    featuredAsset?: ProductAsset;
    assets?: ProductAsset[];
    variants: ProductVariant[];
    price?: {
        value?: number;
        min?: number;
        max?: number;
    };
}
