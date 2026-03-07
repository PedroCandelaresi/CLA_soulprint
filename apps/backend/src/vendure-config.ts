import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import path from 'path';
import { EmailPlugin } from '@vendure/email-plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const ASSET_URL_PREFIX = process.env.ASSET_URL_PREFIX || '/assets/';

export const config: VendureConfig = {
    apiOptions: {
        port: 3001,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true,
        },
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
            password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET || 'cookie-secret',
        },
    },
    dbConnectionOptions: {
        type: 'mysql',
        synchronize: process.env.DB_SYNCHRONIZE !== 'false', // Disable in producción
        logging: false,
        database: process.env.MYSQL_DATABASE || 'vendure',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.MYSQL_USER || 'vendure',
        password: process.env.MYSQL_PASSWORD || 'vendure',
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    customFields: {},
    plugins: [
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            assetUrlPrefix: ASSET_URL_PREFIX.endsWith('/') ? ASSET_URL_PREFIX : `${ASSET_URL_PREFIX}/`,
        }),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: [],
            templatePath: path.join(__dirname, '../static/email/templates'),
            globalTemplateVars: {
                fromAddress: 'noreply@example.com',
                verifyEmailAddressUrl: 'http://localhost:3000/verify',
                passwordResetUrl: 'http://localhost:3000/password-reset',
                changeEmailAddressUrl: 'http://localhost:3000/change-email-address',
            },
            transport: {
                type: 'file',
                outputPath: path.join(__dirname, '../static/email/test-emails'),
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: 3002, // Admin UI standalone mode port (internal)
            adminUiConfig: {
                apiPort: 3001,
                defaultLanguage: LanguageCode.es,
                defaultLocale: 'ES',
            },
        }),
    ],
};
