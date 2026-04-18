import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
    defaultShippingCalculator,
    defaultShippingEligibilityChecker,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import path from 'path';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import { LoggingEmailSender } from './logging-email-sender';
import { createEmailTemplateLoader } from '../email/composite-template-loader';
import { CustomerAccessPlugin } from '../plugins/customer-access/customer-access.plugin';
import { mockPaymentHandler } from '../plugins/payments/mock-payment.plugin';
import { mercadopagoPaymentHandler } from '../plugins/payments/mercadopago/mercadopago.handler';
import { MercadoPagoPlugin } from '../plugins/payments/mercadopago/mercadopago.plugin';
import { transferenciaPaymentHandler } from '../plugins/payments/transferencia-payment.plugin';
import { Badge } from '../plugins/badges/badge.entity';
import { BadgesPlugin } from '../plugins/badges/badges.plugin';
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

function parseMercadoPagoEnv(value: string | undefined): 'testing' | 'production' {
    if (!value || value.trim() === '') {
        return 'testing';
    }

    if (value === 'testing' || value === 'production') {
        return value;
    }

    throw new Error('MERCADOPAGO_ENV must be "testing" or "production".');
}

const APP_ENV = process.env.APP_ENV || 'local';
const IS_DEV = APP_ENV === 'local' || APP_ENV === 'dev';
const IS_PERSISTENT_ENV = APP_ENV === 'testing' || APP_ENV === 'production';
const IS_MIGRATION_COMMAND = process.env.VENDURE_RUN_MIGRATIONS === 'true';
const SUPERADMIN_USERNAME = IS_DEV ? (process.env.SUPERADMIN_USERNAME || 'superadmin') : requireEnv('SUPERADMIN_USERNAME');
const SUPERADMIN_PASSWORD = IS_DEV ? (process.env.SUPERADMIN_PASSWORD || 'superadmin') : requireEnv('SUPERADMIN_PASSWORD');
const COOKIE_SECRET = IS_DEV ? (process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me') : requireEnv('COOKIE_SECRET');
const CORS_ORIGINS = IS_DEV
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
    : requireEnv('CORS_ORIGINS').split(',').map(origin => origin.trim()).filter(Boolean);
const ASSET_URL_PREFIX = process.env.ASSET_URL_PREFIX || '/assets/';
const DB_SYNCHRONIZE = process.env.DB_SYNCHRONIZE ? process.env.DB_SYNCHRONIZE === 'true' : IS_DEV;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
const COOKIE_SAME_SITE = parseSameSite(process.env.COOKIE_SAME_SITE);
const COOKIE_SECURE = parseBooleanEnv('COOKIE_SECURE', !IS_DEV);
const COOKIE_SECURE_PROXY = parseBooleanEnv('COOKIE_SECURE_PROXY', !IS_DEV);
const MERCADOPAGO_ENV = parseMercadoPagoEnv(process.env.MERCADOPAGO_ENV);
const REQUIRE_CUSTOMER_VERIFICATION =
    process.env.REQUIRE_CUSTOMER_VERIFICATION == null || process.env.REQUIRE_CUSTOMER_VERIFICATION === ''
        ? APP_ENV === 'production'
        : parseBooleanEnv('REQUIRE_CUSTOMER_VERIFICATION', APP_ENV === 'production');
const SHOP_PUBLIC_URL = process.env.SHOP_PUBLIC_URL || (IS_DEV ? 'http://localhost:3000' : 'https://cla.nqn.net.ar');
const SMTP_REQUIRED_ENV_VARS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const;
const HAS_ANY_SMTP_ENV = SMTP_REQUIRED_ENV_VARS.some(name => Boolean(process.env[name]));
const HAS_COMPLETE_SMTP_CONFIG = SMTP_REQUIRED_ENV_VARS.every(name => Boolean(process.env[name]));
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const EMAIL_TEMPLATE_PATH = path.join(path.dirname(require.resolve('@vendure/email-plugin/package.json')), 'templates');
const EMAIL_TEMPLATE_LOADER = createEmailTemplateLoader(EMAIL_TEMPLATE_PATH);
const BRAND_NAME = 'CLA Soulprint';
const ALLOW_DESTRUCTIVE_SYNC = process.env.RECREATE_DB_ON_START === 'true' || parseBooleanEnv('ALLOW_DESTRUCTIVE_SYNC', false);
const MIGRATIONS = [
    path.join(__dirname, '../migrations/history/*.js'),
    path.join(__dirname, '../migrations/history/*.ts'),
];
const ADMIN_UI_APP_PATH = path.join(__dirname, '../../static/admin-ui');
const badgeRelationCustomField = {
    name: 'badges',
    type: 'relation' as const,
    list: true,
    entity: Badge,
    graphQLType: 'Badge',
    public: true,
    eager: true,
    nullable: true,
    label: [
        {
            languageCode: LanguageCode.es,
            value: 'Badges',
        },
    ],
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Badges visuales reutilizables para superponer sobre la imagen del producto.',
        },
    ],
};

const promotionBadgeCustomField = {
    name: 'badge',
    type: 'relation' as const,
    list: false,
    entity: Badge,
    graphQLType: 'Badge',
    public: true,
    eager: true,
    nullable: true,
    label: [
        {
            languageCode: LanguageCode.es,
            value: 'Badge',
        },
    ],
    description: [
        {
            languageCode: LanguageCode.es,
            value: 'Badge visual asociado a esta promoción.',
        },
    ],
};

if (IS_PERSISTENT_ENV && DB_SYNCHRONIZE && !ALLOW_DESTRUCTIVE_SYNC) {
    throw new Error(
        'DB_SYNCHRONIZE=true is not allowed in testing/production. Generate and run migrations instead, ' +
            'or set RECREATE_DB_ON_START=true (or ALLOW_DESTRUCTIVE_SYNC=true) if you intentionally want to ' +
            'rebuild the schema from entities on each boot.',
    );
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
if (HAS_ANY_SMTP_ENV && !HAS_COMPLETE_SMTP_CONFIG) {
    const missing = SMTP_REQUIRED_ENV_VARS.filter(name => !process.env[name]);
    throw new Error(`Incomplete SMTP configuration. Missing: ${missing.join(', ')}`);
}
if (HAS_COMPLETE_SMTP_CONFIG && !SHOP_PUBLIC_URL) {
    throw new Error('SHOP_PUBLIC_URL is required when SMTP email is enabled.');
}
if (IS_PERSISTENT_ENV && REQUIRE_CUSTOMER_VERIFICATION && !HAS_COMPLETE_SMTP_CONFIG && !IS_MIGRATION_COMMAND) {
    throw new Error('SMTP configuration is required when REQUIRE_CUSTOMER_VERIFICATION=true in testing/production.');
}

if (!IS_MIGRATION_COMMAND) {
    console.log('[email] EmailPlugin configuration summary:');
    console.log(`[email]   mode=${IS_DEV ? 'dev/file' : (HAS_COMPLETE_SMTP_CONFIG ? 'smtp' : 'DISABLED (missing SMTP config)')}`);
    console.log(`[email]   requireVerification=${String(REQUIRE_CUSTOMER_VERIFICATION)}`);
    console.log(`[email]   hasCompleteSmtpConfig=${String(HAS_COMPLETE_SMTP_CONFIG)}`);
    console.log(`[mercadopago] env=${MERCADOPAGO_ENV}`);
    console.log(
        `[mercadopago] webhookSecretConfigured=${String(Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()))}`,
    );
    console.log(
        `[mercadopago] publicBaseUrl=${process.env.MERCADOPAGO_PUBLIC_BASE_URL || SHOP_PUBLIC_URL || '(unset)'}`,
    );

    if (IS_DEV) {
        console.log(`[email]   shopPublicUrl=${SHOP_PUBLIC_URL || '(unset)'}`);
        console.log(`[email]   smtpHost=${process.env.SMTP_HOST || '(unset)'}`);
        console.log(`[email]   smtpPort=${process.env.SMTP_PORT || '(unset)'}`);
        console.log(`[email]   smtpUser=${process.env.SMTP_USER || '(unset)'}`);
        console.log(`[email]   smtpFrom=${process.env.SMTP_FROM || '(unset)'}`);
        console.log(`[email]   smtpSecure=${String(parseBooleanEnv('SMTP_SECURE', SMTP_PORT === 465))}`);
    }
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
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        requireVerification: REQUIRE_CUSTOMER_VERIFICATION,
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
        synchronize: DB_SYNCHRONIZE && !IS_MIGRATION_COMMAND,
        logging: false,
        database: process.env.DB_NAME || 'vendure',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER || 'vendure',
        password: process.env.DB_PASSWORD || 'vendure',
        migrations: MIGRATIONS,
        migrationsTableName: 'vendure_migrations',
    },
    paymentOptions: {
        paymentMethodHandlers: [
            mercadopagoPaymentHandler,
            transferenciaPaymentHandler,
            mockPaymentHandler,
            ...(APP_ENV !== 'production' ? [dummyPaymentHandler] : []),
        ],
    },
    shippingOptions: {
        shippingCalculators: [defaultShippingCalculator],
        shippingEligibilityCheckers: [defaultShippingEligibilityChecker],
    },
    customFields: {
        Product: [badgeRelationCustomField],
        ProductVariant: [{ ...badgeRelationCustomField }],
        Collection: [{ ...badgeRelationCustomField }],
        Promotion: [promotionBadgeCustomField],
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
                      emailSender: new LoggingEmailSender(),
                      handlers: defaultEmailHandlers,
                      templateLoader: EMAIL_TEMPLATE_LOADER,
                      globalTemplateVars: {
                          fromAddress: process.env.SMTP_FROM || 'noreply@example.com',
                          brandName: BRAND_NAME,
                          shopUrl: SHOP_PUBLIC_URL,
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
            : !IS_MIGRATION_COMMAND && HAS_COMPLETE_SMTP_CONFIG && SHOP_PUBLIC_URL
              ? [
                    EmailPlugin.init({
                        emailSender: new LoggingEmailSender(),
                        handlers: defaultEmailHandlers,
                        templateLoader: EMAIL_TEMPLATE_LOADER,
                        globalTemplateVars: {
                            fromAddress: process.env.SMTP_FROM!,
                            brandName: BRAND_NAME,
                            shopUrl: SHOP_PUBLIC_URL,
                            verifyEmailAddressUrl: `${SHOP_PUBLIC_URL}/verify`,
                            passwordResetUrl: `${SHOP_PUBLIC_URL}/password-reset`,
                            changeEmailAddressUrl: `${SHOP_PUBLIC_URL}/change-email-address`,
                        },
                        transport: {
                            type: 'smtp',
                            host: process.env.SMTP_HOST!,
                            port: SMTP_PORT,
                            auth: {
                                user: process.env.SMTP_USER!,
                                pass: process.env.SMTP_PASSWORD!,
                            },
                            logging: false,
                            debug: false,
                            secure: parseBooleanEnv('SMTP_SECURE', SMTP_PORT === 465),
                        },
                    }),
                ]
            : []),
        CustomerAccessPlugin,
        MercadoPagoPlugin,
        BadgesPlugin,
        PersonalizationPlugin,
        AdminUiPlugin.init({
            route: 'admin',
            port: 3002,
            app: {
                path: ADMIN_UI_APP_PATH,
                route: 'admin',
            },
            adminUiConfig: {
                apiHost: 'auto',
                apiPort: 'auto',
                adminApiPath: 'admin-api',
                tokenMethod: 'bearer',
                defaultLanguage: LanguageCode.es,
                defaultLocale: 'ES',
                brand: 'CLA Soulprint',
                hideVendureBranding: true,
                hideVersion: true,
                loginImageUrl: 'assets/admin-login-hero.svg',
                availableLanguages: [LanguageCode.es, LanguageCode.en],
            },
        }),
    ],
};
