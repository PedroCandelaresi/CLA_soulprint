import 'server-only';

const DEVELOPMENT_VENDURE_FALLBACK_URL = 'http://localhost:3001/shop-api';

function readEnv(name: string): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

function assertDirectVendureShopApiUrl(value: string, envName: string): string {
    if (value.startsWith('/')) {
        throw new Error(`${envName} debe apuntar directo a Vendure, no a una ruta relativa.`);
    }

    let pathname: string;
    try {
        pathname = new URL(value).pathname;
    } catch {
        throw new Error(`${envName} no es una URL válida.`);
    }

    if (pathname.replace(/\/$/, '') === '/api/shop') {
        throw new Error(`${envName} no debe apuntar al proxy /api/shop del storefront; usá /shop-api directo a Vendure.`);
    }

    if (pathname.replace(/\/$/, '') !== '/shop-api') {
        throw new Error(`${envName} debe terminar en /shop-api.`);
    }

    return value;
}

export function isProductionServerRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
}

export function getServerVendureApiUrl(): string {
    const internalApiUrl = readEnv('VENDURE_INTERNAL_API_URL');
    if (internalApiUrl) {
        return assertDirectVendureShopApiUrl(internalApiUrl, 'VENDURE_INTERNAL_API_URL');
    }

    // Production should always talk to Vendure through the internal/private address.
    // The public URL is only tolerated as a development fallback to keep local setups simple.
    if (!isProductionServerRuntime()) {
        return readEnv('NEXT_PUBLIC_VENDURE_API_URL') || DEVELOPMENT_VENDURE_FALLBACK_URL;
    }

    throw new Error(
        'Falta configurar VENDURE_INTERNAL_API_URL para las llamadas server-side a Vendure.',
    );
}

export function getServerVendureRestBaseUrl(): string {
    const apiUrl = getServerVendureApiUrl();

    try {
        const url = new URL(apiUrl);
        url.pathname = url.pathname.replace(/\/shop-api\/?$/, '') || '/';
        url.search = '';
        url.hash = '';
        return url.toString().replace(/\/$/, '');
    } catch {
        return apiUrl.replace(/\/shop-api\/?$/, '').replace(/\/$/, '');
    }
}

export function getAllowedStorefrontOrigins(currentRequestOrigin?: string | null): string[] {
    const origins = new Set<string>();

    if (currentRequestOrigin) {
        origins.add(currentRequestOrigin);
    }

    const configuredSiteUrl = readEnv('NEXT_PUBLIC_SITE_URL');
    if (configuredSiteUrl) {
        try {
            origins.add(new URL(configuredSiteUrl).origin);
        } catch (error) {
            console.error('NEXT_PUBLIC_SITE_URL no es una URL válida para validar Origin', error);
        }
    }

    return [...origins];
}
