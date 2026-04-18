export function formatCurrency(amount: number, currencyCode: string) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
    }).format(amount / 100);
}

export function buildDemoCheckoutUrl(
    pathname: string,
    params: Record<string, string | undefined | null>,
) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== '') {
            searchParams.set(key, value);
        }
    }

    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export function getSafeReturnPath(returnTo: string | null | undefined, fallback = '/checkout') {
    if (!returnTo || !returnTo.startsWith('/')) {
        return fallback;
    }

    return returnTo;
}

export function getDemoShippingEta(province?: string | null) {
    const normalizedProvince = province?.trim().toLowerCase();

    if (!normalizedProvince) {
        return 'Entrega estimada entre 48 y 96 hs hábiles.';
    }

    if (normalizedProvince.includes('buenos aires') || normalizedProvince.includes('caba')) {
        return 'Entrega estimada entre 24 y 48 hs hábiles.';
    }

    if (normalizedProvince.includes('neuqu')) {
        return 'Entrega estimada entre 48 y 72 hs hábiles.';
    }

    return 'Entrega estimada entre 72 y 120 hs hábiles.';
}
