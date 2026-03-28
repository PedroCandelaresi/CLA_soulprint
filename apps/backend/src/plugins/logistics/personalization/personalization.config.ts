export interface PersonalizationConfig {
    allowedMimeTypes: string[];
    maxFileSizeBytes: number;
    tokenSecret: string;
}

export const PERSONALIZATION_CONFIG_OPTIONS = Symbol('PERSONALIZATION_CONFIG_OPTIONS');

function parsePositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPersonalizationConfigFromEnv(): PersonalizationConfig {
    const allowedMimeTypes = (process.env.PERSONALIZATION_ALLOWED_MIME_TYPES
        || 'image/jpeg,image/png,image/webp,application/pdf')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    const maxFileSizeMb = parsePositiveInteger(process.env.PERSONALIZATION_MAX_FILE_SIZE_MB, 10);
    const tokenSecret = process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me';

    return {
        allowedMimeTypes,
        maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
        tokenSecret,
    };
}
