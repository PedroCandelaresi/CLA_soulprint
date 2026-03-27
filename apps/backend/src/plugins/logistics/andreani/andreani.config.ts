export type AndreaniEnvironment = 'production' | 'qa';

export interface AndreaniConfig {
    enabled: boolean;
    environment: AndreaniEnvironment;
    baseUrl: string;
    authToken: string;
    timeoutMs: number;
    contractCode?: string;
    clientCode?: string;
    defaultCategoryId?: string;
    shipmentBaseUrl: string;
    originPostalCode: string;
    originCity: string;
    originProvince?: string;
    originCountry?: string;
    originAddress?: string;
}

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function parseEnvironment(value: string | undefined): AndreaniEnvironment {
    if (!value) {
        return 'production';
    }
    if (value === 'production' || value === 'qa') {
        return value;
    }
    throw new Error('ANDREANI_ENVIRONMENT must be either "production" or "qa".');
}

export function getAndreaniConfigFromEnv(): AndreaniConfig {
    const enabled = (process.env.ANDREANI_ENABLED || 'false').toLowerCase() === 'true';
    const environment = parseEnvironment(process.env.ANDREANI_ENVIRONMENT);
    const token = process.env.ANDREANI_AUTH_TOKEN || '';

    if (!enabled) {
        return {
            enabled: false,
            environment,
            baseUrl: '',
            authToken: '',
            timeoutMs: 10000,
            originPostalCode: '',
            originCity: '',
        };
    }

    const baseUrl =
        process.env.ANDREANI_BASE_URL ||
        (environment === 'production'
            ? 'https://apis.andreanigloballpack.com/cotizador-globallpack/api/v1'
            : 'https://apisqa.andreanigloballpack.com/cotizador-globallpack/api/v1');

    const timeoutMs = Number(process.env.ANDREANI_TIMEOUT_MS || '15000');
    if (!token) {
        throw new Error('ANDREANI_AUTH_TOKEN is required when Andreani integration is enabled.');
    }

    return {
        enabled,
        environment,
        baseUrl,
        authToken: token,
        timeoutMs,
        contractCode: process.env.ANDREANI_CONTRACT_CODE,
        clientCode: process.env.ANDREANI_CLIENT_CODE,
        defaultCategoryId: process.env.ANDREANI_DEFAULT_CATEGORY_ID,
        shipmentBaseUrl:
            process.env.ANDREANI_SHIPMENT_BASE_URL ||
            (environment === 'production'
                ? 'https://apis.andreanigloballpack.com/altapreenvio-globallpack/api/v1'
                : 'https://apisqa.andreanigloballpack.com/altapreenvio-globallpack/api/v1'),
        originPostalCode: requireEnv('ANDREANI_ORIGIN_POSTAL_CODE'),
        originCity: requireEnv('ANDREANI_ORIGIN_CITY'),
        originProvince: process.env.ANDREANI_ORIGIN_PROVINCE,
        originCountry: process.env.ANDREANI_ORIGIN_COUNTRY,
        originAddress: process.env.ANDREANI_ORIGIN_ADDRESS,
    };
}
