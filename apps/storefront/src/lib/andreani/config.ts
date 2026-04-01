function parseBooleanEnv(value: string | undefined): boolean {
    return value?.trim().toLowerCase() === 'true';
}

export const ANDREANI_ENABLED = parseBooleanEnv(process.env.NEXT_PUBLIC_ANDREANI_ENABLED);

export const ANDREANI_DISABLED_MESSAGE =
    'La cotización y el tracking de Andreani están temporalmente deshabilitados.';

export const ANDREANI_TRACKING_BASE_URL =
    process.env.NEXT_PUBLIC_ANDREANI_TRACKING_URL?.trim()
    || 'https://www.andreani.com/rastreo/';

export function buildAndreaniTrackingUrl(trackingNumber: string): string {
    const base = ANDREANI_TRACKING_BASE_URL.endsWith('/')
        ? ANDREANI_TRACKING_BASE_URL
        : `${ANDREANI_TRACKING_BASE_URL}/`;
    return `${base}${encodeURIComponent(trackingNumber)}`;
}
