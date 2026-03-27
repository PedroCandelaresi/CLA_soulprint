import type { Cart } from '@/types/cart';

const DEFAULT_WEIGHT_PER_ITEM_KG = 0.6;
const MINIMUM_WEIGHT_KG = 0.2;

export function estimateOrderWeight(cart: Cart): number {
    if (!cart || cart.totalQuantity <= 0) {
        return MINIMUM_WEIGHT_KG;
    }

    const estimated = cart.totalQuantity * DEFAULT_WEIGHT_PER_ITEM_KG;
    return Number(Math.max(MINIMUM_WEIGHT_KG, estimated).toFixed(2));
}
