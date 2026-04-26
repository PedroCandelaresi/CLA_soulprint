const DEFAULT_SITE_URL = 'http://localhost:3000';
const DEFAULT_STORE_NAME = 'CLA Soulprint';
const DEFAULT_STORE_LOGO = '/images/logos/CLA.svg';

type JsonLdValue = string | number | boolean | JsonLdObject | JsonLdValue[];
type JsonLdObject = Record<string, JsonLdValue | null | undefined>;

function readEnv(name: string): string | null {
    const value = process.env[name]?.trim();
    return value ? value : null;
}

function cleanText(value?: string | null): string {
    return (value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitEnvList(value?: string | null): string[] {
    return (value || '')
        .split(',')
        .map(cleanText)
        .filter(Boolean);
}

function compactObject<T extends JsonLdObject>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => {
            if (item == null) {
                return false;
            }

            if (Array.isArray(item)) {
                return item.length > 0;
            }

            if (typeof item === 'string') {
                return item.length > 0;
            }

            return true;
        }),
    ) as Partial<T>;
}

export function getPublicSiteUrl(): string {
    const rawSiteUrl = readEnv('SITE_URL') || readEnv('NEXT_PUBLIC_SITE_URL') || DEFAULT_SITE_URL;

    try {
        return new URL(rawSiteUrl).origin;
    } catch {
        return DEFAULT_SITE_URL;
    }
}

function absoluteUrl(pathOrUrl: string): string {
    try {
        return new URL(pathOrUrl).toString();
    } catch {
        return new URL(pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`, getPublicSiteUrl()).toString();
    }
}

export function stringifyJsonLd(jsonLd: JsonLdObject): string {
    return JSON.stringify(jsonLd).replace(/</g, '\\u003c');
}

export function buildStoreJsonLd(): JsonLdObject {
    const name = cleanText(readEnv('NEXT_PUBLIC_STORE_NAME')) || DEFAULT_STORE_NAME;
    const logo = absoluteUrl(readEnv('NEXT_PUBLIC_STORE_LOGO') || DEFAULT_STORE_LOGO);
    const streetAddress = cleanText(readEnv('NEXT_PUBLIC_STORE_ADDRESS'));
    const addressLocality = cleanText(readEnv('NEXT_PUBLIC_STORE_CITY'));
    const addressRegion = cleanText(readEnv('NEXT_PUBLIC_STORE_REGION'));
    const addressCountry = cleanText(readEnv('NEXT_PUBLIC_STORE_COUNTRY')) || 'AR';
    const telephone = cleanText(readEnv('NEXT_PUBLIC_STORE_PHONE'));
    const sameAs = splitEnvList(readEnv('NEXT_PUBLIC_STORE_SOCIAL_URLS')).map(absoluteUrl);
    const openingHours = splitEnvList(readEnv('NEXT_PUBLIC_STORE_OPENING_HOURS'));
    const hasAddressData = Boolean(streetAddress || addressLocality || addressRegion);
    const hasLocalBusinessData = Boolean(
        streetAddress || addressLocality || addressRegion || telephone || openingHours.length,
    );
    const address = compactObject({
        '@type': 'PostalAddress',
        streetAddress,
        addressLocality,
        addressRegion,
        addressCountry,
    }) as JsonLdObject;

    return compactObject({
        '@context': 'https://schema.org',
        '@type': hasLocalBusinessData ? 'LocalBusiness' : 'Organization',
        name,
        url: getPublicSiteUrl(),
        logo,
        image: logo,
        telephone,
        sameAs,
        openingHours,
        address: hasAddressData ? address : undefined,
    }) as JsonLdObject;
}
