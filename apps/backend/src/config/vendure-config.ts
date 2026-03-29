import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
    Asset,
    NativeAuthenticationStrategy,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import path from 'path';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import { getAdminUiApp } from '../admin-ui/config';
import { adminUiConfig, adminUiPort, adminUiRoute } from '../admin-ui/admin-ui-options';
import { GetnetPlugin, initGetnetPlugin, getGetnetMiddleware, getGetnetConfigFromEnv, getnetPaymentHandler } from '../plugins/payments/getnet';
import { GetnetPaymentTransaction } from '../plugins/payments/getnet/getnet-transaction.entity';
import { GoogleAuthPlugin, getGoogleAuthConfigFromEnv, GoogleAuthenticationStrategy } from '../plugins/auth/google-auth';
import { PersonalizationPlugin } from '../plugins/logistics/personalization';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
    const value = process.env[name];
    if (value == null || value === '') {
        return defaultValue;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    throw new Error(`${name} must be "true" or "false".`);
}

function parseSameSite(value: string | undefined): 'strict' | 'lax' | 'none' {
    if (!value) {
        return 'lax';
    }
    if (value === 'strict' || value === 'lax' || value === 'none') {
        return value;
    }
    throw new Error('COOKIE_SAME_SITE must be one of: strict, lax, none.');
}

const APP_ENV = process.env.APP_ENV || 'local';
const IS_DEV = APP_ENV === 'local' || APP_ENV === 'dev';
const IS_PERSISTENT_ENV = APP_ENV === 'testing' || APP_ENV === 'production';
const IS_MIGRATION_COMMAND = process.env.VENDURE_RUN_MIGRATIONS === 'true';
const IS_GETNET_MOCK = (process.env.GETNET_MODE || 'real').toLowerCase() === 'mock';
const SUPERADMIN_USERNAME = IS_DEV ? (process.env.SUPERADMIN_USERNAME || 'superadmin') : requireEnv('SUPERADMIN_USERNAME');
const SUPERADMIN_PASSWORD = IS_DEV ? (process.env.SUPERADMIN_PASSWORD || 'superadmin') : requireEnv('SUPERADMIN_PASSWORD');
const COOKIE_SECRET = IS_DEV ? (process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me') : requireEnv('COOKIE_SECRET');
const CORS_ORIGINS = IS_DEV
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000', 'http://localhost:4001', 'http://localhost:4002']
    : requireEnv('CORS_ORIGINS').split(',').map(origin => origin.trim()).filter(Boolean);
const ASSET_URL_PREFIX = process.env.ASSET_URL_PREFIX || '/assets/';
const DB_SYNCHRONIZE = process.env.DB_SYNCHRONIZE ? process.env.DB_SYNCHRONIZE === 'true' : IS_DEV;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
const COOKIE_SAME_SITE = parseSameSite(process.env.COOKIE_SAME_SITE);
const COOKIE_SECURE = parseBooleanEnv('COOKIE_SECURE', !IS_DEV);
const COOKIE_SECURE_PROXY = parseBooleanEnv('COOKIE_SECURE_PROXY', !IS_DEV);
const SHOP_PUBLIC_URL = process.env.SHOP_PUBLIC_URL || (IS_DEV ? 'http://localhost:4000' : undefined);
const SMTP_BOOTSTRAP_FALLBACK = {
    host: '127.0.0.1',
    port: 1025,
    user: 'cla-bootstrap-user',
    password: 'cla-bootstrap-password',
    from: 'CLA Testing <noreply@cla.local>',
} as const;
const SMTP_HOST = process.env.SMTP_HOST || SMTP_BOOTSTRAP_FALLBACK.host;
const SMTP_PORT = Number(process.env.SMTP_PORT || SMTP_BOOTSTRAP_FALLBACK.port);
const SMTP_USER = process.env.SMTP_USER || SMTP_BOOTSTRAP_FALLBACK.user;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || SMTP_BOOTSTRAP_FALLBACK.password;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_BOOTSTRAP_FALLBACK.from;
const IS_USING_SMTP_BOOTSTRAP_FALLBACK = !IS_DEV
    && !IS_MIGRATION_COMMAND
    && ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'].some(name => !process.env[name]);
const EMAIL_TEMPLATE_PATH = path.join(path.dirname(require.resolve('@vendure/email-plugin/package.json')), 'templates');
const MIGRATIONS = [
    path.join(__dirname, '../migrations/history/*.js'),
    path.join(__dirname, '../migrations/history/*.ts'),
];
const GOOGLE_AUTH_CONFIG = getGoogleAuthConfigFromEnv();

if (IS_PERSISTENT_ENV && DB_SYNCHRONIZE) {
    throw new Error('DB_SYNCHRONIZE=true is not allowed in testing/production. Generate and run migrations instead.');
}
if (IS_PERSISTENT_ENV && (SUPERADMIN_USERNAME === 'superadmin' || SUPERADMIN_PASSWORD === 'superadmin')) {
    throw new Error('SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must not use default bootstrap credentials in testing/production.');
}
if (IS_PERSISTENT_ENV && !COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in testing/production.');
}
if (COOKIE_SAME_SITE === 'none' && !COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE=none.');
}
if (APP_ENV === 'production' && !COOKIE_DOMAIN) {
    throw new Error('COOKIE_DOMAIN is required in production.');
}
if (IS_PERSISTENT_ENV && CORS_ORIGINS.some(origin => origin === '*')) {
    throw new Error('CORS_ORIGINS must not contain "*".');
}
if (APP_ENV === 'production' && CORS_ORIGINS.some(origin => !origin.startsWith('https://'))) {
    throw new Error('Production CORS_ORIGINS must use https:// origins.');
}
if (!Number.isFinite(SMTP_PORT) || SMTP_PORT <= 0) {
    throw new Error('SMTP_PORT must be a positive number.');
}
if (!IS_DEV && !IS_MIGRATION_COMMAND && !SHOP_PUBLIC_URL) {
    throw new Error('SHOP_PUBLIC_URL is required when email is enabled outside local/dev.');
}
if (IS_USING_SMTP_BOOTSTRAP_FALLBACK) {
    console.warn('[email] Using temporary hardcoded SMTP bootstrap defaults. Replace SMTP_* env vars with real provider values when ready.');
}

export const config: VendureConfig = {
    defaultLanguageCode: LanguageCode.es,
    apiOptions: {
        port: 3001,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        cors: {
            origin: CORS_ORIGINS,
            credentials: true,
        },
        middleware: [],
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        shopAuthenticationStrategy: [
            new NativeAuthenticationStrategy(),
            ...(GOOGLE_AUTH_CONFIG.enabled ? [new GoogleAuthenticationStrategy()] : []),
        ],
        superadminCredentials: {
            identifier: SUPERADMIN_USERNAME,
            password: SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: COOKIE_SECRET,
            domain: COOKIE_DOMAIN,
            sameSite: COOKIE_SAME_SITE,
            secure: COOKIE_SECURE,
            secureProxy: COOKIE_SECURE_PROXY,
            httpOnly: true,
        },
    },
    dbConnectionOptions: {
        type: 'mysql',
        synchronize: IS_DEV && DB_SYNCHRONIZE,
        logging: false,
        entities: [GetnetPaymentTransaction],
        database: process.env.DB_NAME || 'vendure',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER || 'vendure',
        password: process.env.DB_PASSWORD || 'vendure',
        migrations: MIGRATIONS,
        migrationsTableName: 'vendure_migrations',
    },
    paymentOptions: {
        // Payment method handlers configuration
        // In development: include both dummy (for testing) and Getnet
        // In production: only include Getnet (when credentials are configured)
        paymentMethodHandlers: IS_DEV 
            ? [dummyPaymentHandler, getnetPaymentHandler] 
            : (process.env.GETNET_ENABLED === 'true' && (IS_GETNET_MOCK || process.env.GETNET_CLIENT_ID !== 'your_client_id') 
                ? [getnetPaymentHandler] 
                : []),
    },
    customFields: {
        Order: [
            { name: 'andreaniCarrier', type: 'string', nullable: true },
            { name: 'andreaniServiceCode', type: 'string', nullable: true },
            { name: 'andreaniServiceName', type: 'string', nullable: true },
            { name: 'andreaniPrice', type: 'float', nullable: true },
            { name: 'andreaniCurrency', type: 'string', nullable: true },
            { name: 'andreaniDestinationPostalCode', type: 'string', nullable: true },
            { name: 'andreaniDestinationCity', type: 'string', nullable: true },
            { name: 'andreaniSelectionMetadata', type: 'string', nullable: true },
            { name: 'andreaniWeightKg', type: 'float', nullable: true },
            { name: 'andreaniDimensions', type: 'string', nullable: true },
            { name: 'andreaniShipmentCreated', type: 'boolean', nullable: true },
            { name: 'andreaniShipmentDate', type: 'datetime', nullable: true },
            { name: 'andreaniTrackingNumber', type: 'string', nullable: true },
            { name: 'andreaniShipmentId', type: 'string', nullable: true },
            { name: 'andreaniShipmentStatus', type: 'string', nullable: true },
            { name: 'andreaniShipmentRawResponse', type: 'string', nullable: true },
            { name: 'personalizationRequired', type: 'boolean', defaultValue: false, public: false },
            { name: 'personalizationStatus', type: 'string', nullable: false, defaultValue: 'not-required', public: false },
            { name: 'personalizationAsset', type: 'relation', entity: Asset, nullable: true, public: false },
            { name: 'personalizationAssetPreviewUrl', type: 'text', nullable: true, public: false },
            { name: 'personalizationOriginalFilename', type: 'string', nullable: true, public: false },
            { name: 'personalizationUploadedAt', type: 'datetime', nullable: true, public: false },
            { name: 'personalizationNotes', type: 'text', nullable: true, public: false },
        ],
        ProductVariant: [
            { name: 'requiresPersonalization', type: 'boolean', defaultValue: false, public: true },
        ],
    },
    plugins: [
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../../static/assets'),
            assetUrlPrefix: ASSET_URL_PREFIX.endsWith('/') ? ASSET_URL_PREFIX : `${ASSET_URL_PREFIX}/`,
        }),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        ...(IS_DEV && !IS_MIGRATION_COMMAND
            ? [
                  EmailPlugin.init({
                      devMode: true,
                      outputPath: path.join(__dirname, '../../static/email/test-emails'),
                      route: 'mailbox',
                      handlers: defaultEmailHandlers,
                      templatePath: EMAIL_TEMPLATE_PATH,
                      globalTemplateVars: {
                          fromAddress: SMTP_FROM,
                          verifyEmailAddressUrl: `${SHOP_PUBLIC_URL}/verify`,
                          passwordResetUrl: `${SHOP_PUBLIC_URL}/password-reset`,
                          changeEmailAddressUrl: `${SHOP_PUBLIC_URL}/change-email-address`,
                      },
                      transport: {
                          type: 'file',
                          outputPath: path.join(__dirname, '../../static/email/test-emails'),
                      },
                  }),
              ]
            : !IS_MIGRATION_COMMAND && SHOP_PUBLIC_URL
              ? [
                    EmailPlugin.init({
                        handlers: defaultEmailHandlers,
                        templatePath: EMAIL_TEMPLATE_PATH,
                        globalTemplateVars: {
                            fromAddress: SMTP_FROM,
                            verifyEmailAddressUrl: `${SHOP_PUBLIC_URL}/verify`,
                            passwordResetUrl: `${SHOP_PUBLIC_URL}/password-reset`,
                            changeEmailAddressUrl: `${SHOP_PUBLIC_URL}/change-email-address`,
                        },
                        transport: {
                            type: 'smtp',
                            host: SMTP_HOST,
                            port: SMTP_PORT,
                            auth: {
                                user: SMTP_USER,
                                pass: SMTP_PASSWORD,
                            },
                            secure: parseBooleanEnv('SMTP_SECURE', SMTP_PORT === 465),
                        },
                    }),
                ]
            : []),
        AdminUiPlugin.init({
            route: adminUiRoute,
            port: adminUiPort, // Admin UI standalone mode port (internal)
            app: getAdminUiApp(),
            adminUiConfig,
        }),
        GetnetPlugin,
        GoogleAuthPlugin,
        PersonalizationPlugin,
    ],
};
