import type { ProductBadge } from '@/types/product';

export interface ResolveBadgesInput {
    productBadges?: ProductBadge[] | null;
    variantBadges?: ProductBadge[] | null;
    collectionBadges?: ProductBadge[] | null;
    now?: Date;
}

export function isBadgeExpired(
    badge: Pick<ProductBadge, 'expiresAt'>,
    now: Date = new Date(),
): boolean {
    if (!badge.expiresAt) {
        return false;
    }

    const expiresAt = Date.parse(badge.expiresAt);
    if (Number.isNaN(expiresAt)) {
        return false;
    }

    return expiresAt < now.getTime();
}

export function isBadgeActive(
    badge: ProductBadge,
    now: Date = new Date(),
): boolean {
    return badge.enabled === true && !isBadgeExpired(badge, now);
}

export function getActiveBadges(
    badges?: ProductBadge[] | null,
    now: Date = new Date(),
): ProductBadge[] {
    return dedupeBadgesByCode((badges ?? []).filter((badge) => isBadgeActive(badge, now))).sort(compareBadges);
}

export function resolveBadges({
    productBadges,
    variantBadges,
    collectionBadges,
    now = new Date(),
}: ResolveBadgesInput): ProductBadge[] {
    const resolved = new Map<string, ProductBadge>();

    // Lowest priority: collection badges
    for (const badge of getActiveBadges(collectionBadges, now)) {
        resolved.set(normalizeBadgeCode(badge.code), badge);
    }

    // Medium priority: product badges
    for (const badge of getActiveBadges(productBadges, now)) {
        resolved.set(normalizeBadgeCode(badge.code), badge);
    }

    // Highest priority: variant badges
    for (const badge of getActiveBadges(variantBadges, now)) {
        resolved.set(normalizeBadgeCode(badge.code), badge);
    }

    return Array.from(resolved.values()).sort(compareBadges);
}

function dedupeBadgesByCode(badges: ProductBadge[]): ProductBadge[] {
    const deduped = new Map<string, ProductBadge>();

    for (const badge of badges.sort(compareBadges)) {
        const normalizedCode = normalizeBadgeCode(badge.code);
        if (!deduped.has(normalizedCode)) {
            deduped.set(normalizedCode, badge);
        }
    }

    return Array.from(deduped.values());
}

function compareBadges(left: ProductBadge, right: ProductBadge): number {
    return (
        normalizeBadgePriority(left.priority) - normalizeBadgePriority(right.priority) ||
        left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }) ||
        left.code.localeCompare(right.code, 'es', { sensitivity: 'base' })
    );
}

function normalizeBadgeCode(code: string): string {
    return code.trim().toLowerCase();
}

function normalizeBadgePriority(priority: number): number {
    return Number.isFinite(priority) ? priority : 0;
}
