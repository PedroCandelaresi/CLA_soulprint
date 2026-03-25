import fs from 'fs';
import path from 'path';
import type { AdminUiPluginOptions } from '@vendure/admin-ui-plugin';
import { adminUiConfig, adminUiRoute } from './admin-ui-options';

type AdminUiApp = NonNullable<AdminUiPluginOptions['app']>;

const ADMIN_ROUTE = adminUiRoute;
const ADMIN_UI_OUTPUT_PATH = path.join(__dirname, '../../admin-ui');
const ADMIN_UI_SOURCE_PATH = path.join(__dirname, '../../admin-ui-src');
const DEFAULT_ADMIN_UI_PATH = path.join(path.dirname(require.resolve('@vendure/admin-ui-plugin/package.json')), 'lib/admin-ui');

function copyFile(sourcePath: string, destinationPath: string): void {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
}

function injectCustomStylesheet(indexHtmlPath: string): void {
    const currentHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    if (currentHtml.includes('cla-soulprint-admin.css')) {
        return;
    }

    const updatedHtml = currentHtml.replace(
        '</head>',
        '  <link rel="stylesheet" href="cla-soulprint-admin.css" />\n</head>',
    );

    fs.writeFileSync(indexHtmlPath, updatedHtml, 'utf8');
}

function injectCustomScript(indexHtmlPath: string): void {
    const currentHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    if (currentHtml.includes('cla-soulprint-admin.js')) {
        return;
    }

    const updatedHtml = currentHtml.replace(
        '</body>',
        '    <script src="cla-soulprint-admin.js"></script></body>',
    );

    fs.writeFileSync(indexHtmlPath, updatedHtml, 'utf8');
}

function patchTranslationFile(
    translationFilePath: string,
    sourceTranslationPath: string,
): void {
    const translations = JSON.parse(fs.readFileSync(translationFilePath, 'utf8')) as {
        common?: Record<string, string>;
    };
    const sourceTranslations = JSON.parse(fs.readFileSync(sourceTranslationPath, 'utf8')) as {
        common?: Record<string, string>;
    };

    translations.common = {
        ...(translations.common ?? {}),
        ...(sourceTranslations.common ?? {}),
    };

    fs.writeFileSync(translationFilePath, `${JSON.stringify(translations, null, 2)}\n`, 'utf8');
}

function patchVendureUiConfig(vendureUiConfigPath: string): void {
    const currentConfig = JSON.parse(fs.readFileSync(vendureUiConfigPath, 'utf8')) as Record<string, unknown>;
    const nextConfig = {
        ...currentConfig,
        ...adminUiConfig,
    };

    fs.writeFileSync(vendureUiConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
}

function copyBrandingAssets(): void {
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'assets/cla-logo-top-source.webp'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'assets/logo-top.webp'),
    );
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'assets/cla-logo-login-source.webp'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'assets/logo-login.webp'),
    );
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'assets/cla-admin-login-hero-source.webp'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'assets/cla-admin-login-hero.webp'),
    );
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'assets/cla-favicon-source.ico'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'favicon.ico'),
    );
}

export async function buildAdminUi(): Promise<void> {
    fs.rmSync(ADMIN_UI_OUTPUT_PATH, { recursive: true, force: true });
    fs.cpSync(DEFAULT_ADMIN_UI_PATH, ADMIN_UI_OUTPUT_PATH, { recursive: true });

    copyBrandingAssets();
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'cla-theme.scss'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'cla-soulprint-admin.css'),
    );
    copyFile(
        path.join(ADMIN_UI_SOURCE_PATH, 'cla-login-enhancements.js'),
        path.join(ADMIN_UI_OUTPUT_PATH, 'cla-soulprint-admin.js'),
    );
    injectCustomStylesheet(path.join(ADMIN_UI_OUTPUT_PATH, 'index.html'));
    injectCustomScript(path.join(ADMIN_UI_OUTPUT_PATH, 'index.html'));
    patchVendureUiConfig(path.join(ADMIN_UI_OUTPUT_PATH, 'vendure-ui-config.json'));

    patchTranslationFile(
        path.join(ADMIN_UI_OUTPUT_PATH, 'i18n-messages/es.json'),
        path.join(ADMIN_UI_SOURCE_PATH, 'translations/es.json'),
    );
    patchTranslationFile(
        path.join(ADMIN_UI_OUTPUT_PATH, 'i18n-messages/en.json'),
        path.join(ADMIN_UI_SOURCE_PATH, 'translations/en.json'),
    );
}

export function hasBuiltAdminUi(): boolean {
    return fs.existsSync(path.join(ADMIN_UI_OUTPUT_PATH, 'index.html'));
}

export function getAdminUiApp(options?: {
    preferPrebuilt?: boolean;
}): AdminUiApp {
    const preferPrebuilt = options?.preferPrebuilt ?? true;

    if (preferPrebuilt && hasBuiltAdminUi()) {
        return {
            path: ADMIN_UI_OUTPUT_PATH,
            route: ADMIN_ROUTE,
        };
    }

    return {
        path: ADMIN_UI_OUTPUT_PATH,
        route: ADMIN_ROUTE,
        compile: buildAdminUi,
    };
}

export const adminUiPaths = {
    outputPath: ADMIN_UI_OUTPUT_PATH,
    route: ADMIN_ROUTE,
    sourcePath: ADMIN_UI_SOURCE_PATH,
};
