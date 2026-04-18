import type { Product, ProductOptionGroup, ProductVariant } from '@/types/product';

export type OptionSelection = Record<string, string>;

export type SearchParamRecord = Record<string, string | string[] | undefined>;

export interface InitialVariantState {
    selectedVariant?: ProductVariant;
    selectedOptions: OptionSelection;
    matchedQuery: boolean;
}

export interface OptionAvailability {
    exists: boolean;
    inStock: boolean;
    variant?: ProductVariant;
}

function normalizeSearchParamValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function isInStock(variant?: ProductVariant): boolean {
    return variant != null && variant.stockLevel !== 'OUT_OF_STOCK';
}

export function getDefaultVariant(variants: ProductVariant[]): ProductVariant | undefined {
    return variants.find(isInStock) ?? variants[0];
}

export function getVariantOptionSelection(variant?: ProductVariant): OptionSelection {
    return Object.fromEntries((variant?.options ?? []).map((option) => [option.groupId, option.id]));
}

export function matchesSelection(variant: ProductVariant, selection: OptionSelection): boolean {
    const variantSelection = getVariantOptionSelection(variant);

    return Object.entries(selection).every(([groupId, optionId]) => variantSelection[groupId] === optionId);
}

export function findMatchingVariants(
    variants: ProductVariant[],
    selection: OptionSelection,
): ProductVariant[] {
    if (Object.keys(selection).length === 0) {
        return variants;
    }

    return variants.filter((variant) => matchesSelection(variant, selection));
}

export function findVariantForSelection(
    variants: ProductVariant[],
    optionGroups: ProductOptionGroup[],
    selection: OptionSelection,
): ProductVariant | undefined {
    if (
        optionGroups.length > 0 &&
        optionGroups.some((group) => selection[group.id] == null)
    ) {
        return undefined;
    }

    return variants.find((variant) => matchesSelection(variant, selection));
}

export function getInitialVariantState(
    product: Product,
    searchParams: SearchParamRecord = {},
): InitialVariantState {
    const optionGroups = product.optionGroups ?? [];
    const defaultVariant = getDefaultVariant(product.variants);

    if (!defaultVariant) {
        return {
            selectedVariant: undefined,
            selectedOptions: {},
            matchedQuery: false,
        };
    }

    if (optionGroups.length === 0) {
        const requestedVariantId = normalizeSearchParamValue(searchParams.variant);
        const requestedVariant = requestedVariantId
            ? product.variants.find((variant) => variant.id === requestedVariantId)
            : undefined;

        return {
            selectedVariant: requestedVariant ?? defaultVariant,
            selectedOptions: getVariantOptionSelection(requestedVariant ?? defaultVariant),
            matchedQuery: Boolean(requestedVariant),
        };
    }

    const querySelection: OptionSelection = {};

    for (const group of optionGroups) {
        const requestedOption = normalizeSearchParamValue(searchParams[group.code]);
        if (!requestedOption) {
            continue;
        }

        const matchingOption = group.options.find(
            (option) => option.code === requestedOption || option.id === requestedOption,
        );

        if (matchingOption) {
            querySelection[group.id] = matchingOption.id;
        }
    }

    if (Object.keys(querySelection).length > 0) {
        const exactVariant = findVariantForSelection(product.variants, optionGroups, querySelection);
        if (exactVariant) {
            return {
                selectedVariant: exactVariant,
                selectedOptions: getVariantOptionSelection(exactVariant),
                matchedQuery: true,
            };
        }

        const matchingVariants = findMatchingVariants(product.variants, querySelection);
        if (matchingVariants.length === 1) {
            const matchedVariant = matchingVariants[0];
            return {
                selectedVariant: matchedVariant,
                selectedOptions: getVariantOptionSelection(matchedVariant),
                matchedQuery: true,
            };
        }
    }

    return {
        selectedVariant: defaultVariant,
        selectedOptions: getVariantOptionSelection(defaultVariant),
        matchedQuery: false,
    };
}

export function getOptionAvailability(
    product: Product,
    selection: OptionSelection,
    groupId: string,
    optionId: string,
): OptionAvailability {
    const optionGroups = product.optionGroups ?? [];
    const nextSelection = { ...selection, [groupId]: optionId };
    const matchingVariant = findVariantForSelection(product.variants, optionGroups, nextSelection);

    return {
        exists: Boolean(matchingVariant),
        inStock: isInStock(matchingVariant),
        variant: matchingVariant,
    };
}

export function buildVariantQueryString(
    product: Product,
    selection: OptionSelection,
    selectedVariant: ProductVariant | undefined,
    currentSearchParams: URLSearchParams,
): string {
    const nextSearchParams = new URLSearchParams(currentSearchParams);

    nextSearchParams.delete('variant');
    for (const group of product.optionGroups ?? []) {
        nextSearchParams.delete(group.code);
    }

    if ((product.optionGroups?.length ?? 0) > 0) {
        for (const group of product.optionGroups ?? []) {
            const optionId = selection[group.id];
            const option = group.options.find((item) => item.id === optionId);

            if (option) {
                nextSearchParams.set(group.code, option.code || option.id);
            }
        }
    } else if (selectedVariant?.id) {
        nextSearchParams.set('variant', selectedVariant.id);
    }

    return nextSearchParams.toString();
}

export function areSelectionsEqual(left: OptionSelection, right: OptionSelection): boolean {
    const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    if (leftEntries.length !== rightEntries.length) {
        return false;
    }

    return leftEntries.every(([leftKey, leftValue], index) => {
        const [rightKey, rightValue] = rightEntries[index];
        return leftKey === rightKey && leftValue === rightValue;
    });
}
