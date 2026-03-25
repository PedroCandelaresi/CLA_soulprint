import { LanguageCode } from '@vendure/core';

export const adminUiRoute = 'admin';
export const adminUiPort = 3002;

export const adminUiConfig = {
    apiHost: 'auto',
    apiPort: 'auto',
    adminApiPath: 'admin-api',
    tokenMethod: 'bearer',
    authTokenHeaderKey: 'vendure-auth-token',
    brand: 'CLA Soulprint',
    hideVersion: true,
    loginImageUrl: 'assets/cla-admin-login-hero.webp',
    defaultLanguage: LanguageCode.es,
    defaultLocale: 'ES',
} as const;
