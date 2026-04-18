import 'server-only';

const DEVELOPMENT_VENDURE_FALLBACK_URL = 'http://localhost:3001/shop-api';

function readEnv(name: string): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

export function isProductionServerRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
}

export function getServerVendureApiUrl(): string {
    const internalApiUrl = readEnv('VENDURE_INTERNAL_API_URL');
    if (internalApiUrl) {
        return internalApiUrl;
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
