export interface ProductVariant {
    id?: string;
    name?: string;
    sku?: string;
    price: number;
    priceWithTax?: number;
    currencyCode: string;
    stockLevel?: string;
    featuredAsset?: ProductAsset | null;
    assets?: ProductAsset[];
    options?: ProductOption[];
    customFields?: ProductVariantCustomFields;
}

export interface ProductAsset {
    preview: string;
    source?: string;
}

export interface ProductBadge {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    priority: number;
    backgroundColor?: string | null;
    textColor?: string | null;
    expiresAt?: string | null;
    featuredAsset?: ProductAsset | null;
    featuredAssetId?: string | null;
    renderedSvg?: string | null;
}

export interface ProductCustomFields {
    badges?: ProductBadge[];
}

export interface CollectionCustomFields {
    badges?: ProductBadge[];
}

export interface ProductCollection {
    id: string;
    name?: string;
    slug?: string;
    customFields?: CollectionCustomFields;
}

export interface ProductVariantCustomFields {
    badges?: ProductBadge[];
}

export interface ProductOptionGroupRef {
    id: string;
    code: string;
    name: string;
}

export interface ProductOption {
    id: string;
    code: string;
    name: string;
    groupId: string;
    group?: ProductOptionGroupRef;
}

export interface ProductOptionGroup {
    id: string;
    code: string;
    name: string;
    options: ProductOption[];
}

export interface ProductFacetValue {
    id: string;
    code: string;
    name: string;
}

export interface Product {
    id: string;
    productId?: string;
    name: string;
    slug: string;
    description: string;
    featuredAsset?: ProductAsset | null;
    assets?: ProductAsset[];
    facetValues?: ProductFacetValue[];
    optionGroups?: ProductOptionGroup[];
    variants: ProductVariant[];
    customFields?: ProductCustomFields;
    collections?: ProductCollection[];
    price?: {
        value?: number;
        min?: number;
        max?: number;
    };
}
