import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { AdminUiPluginOptions } from '@vendure/admin-ui-plugin';
import type { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { adminUiConfig, adminUiRoute } from './admin-ui-options';

type AdminUiApp = NonNullable<AdminUiPluginOptions['app']>;

const ADMIN_ROUTE = adminUiRoute;
const ADMIN_UI_BUILD_PATH = path.join(__dirname, '../../admin-ui');
const ADMIN_UI_OUTPUT_PATH = path.join(ADMIN_UI_BUILD_PATH, 'dist');
const ADMIN_UI_SOURCE_PATH = path.join(__dirname, '../../admin-ui-src');
const ORDER_DETAIL_EXTENSION_PATH = path.join(ADMIN_UI_SOURCE_PATH, 'extensions/order-detail');
const BRAND_LOGO_SOURCE_CANDIDATES = [
    path.join(ADMIN_UI_SOURCE_PATH, 'assets/cla-logo-source.svg'),
    path.resolve(ADMIN_UI_SOURCE_PATH, '../../storefront/public/images/logos/CLA.svg'),
];
const ADMIN_UI_EXTENSION: AdminUiExtension = {
    extensionPath: ORDER_DETAIL_EXTENSION_PATH,
    ngModules: [
        {
            type: 'shared',
            ngModuleFileName: 'order-detail.module.ts',
            ngModuleName: 'OrderDetailExtensionModule',
        },
    ],
};
const UI_DEVKIT_ROOT = path.dirname(require.resolve('@vendure/ui-devkit/package.json'));
const VENDURE_ADMIN_UI_PACKAGE_PATH = require.resolve('@vendure/admin-ui/package.json');
const VENDURE_ADMIN_UI_PACKAGE = JSON.parse(fs.readFileSync(VENDURE_ADMIN_UI_PACKAGE_PATH, 'utf8')) as {
    version: string;
    dependencies?: Record<string, string>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setBaseHref, setupScaffold } = require(path.join(UI_DEVKIT_ROOT, 'compiler/scaffold.js')) as {
    setBaseHref: (outputPath: string, baseHref: string) => Promise<void>;
    setupScaffold: (outputPath: string, extensions: AdminUiExtension[]) => Promise<void>;
};
const ADMIN_UI_BUILD_TOOLING = {
    '@angular/cli': '^17.3.17',
    '@angular-devkit/build-angular': '^17.3.17',
    '@angular/compiler-cli': '^17.3.12',
    typescript: '5.4.2',
};

function copyFile(sourcePath: string, destinationPath: string): void {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
}

function writeFile(destinationPath: string, contents: string): void {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, contents, 'utf8');
}

function resolveBrandLogoSourcePath(): string {
    const existingSourcePath = BRAND_LOGO_SOURCE_CANDIDATES.find((candidatePath) =>
        fs.existsSync(candidatePath),
    );

    if (!existingSourcePath) {
        throw new Error(
            `Unable to find CLA logo source SVG. Checked: ${BRAND_LOGO_SOURCE_CANDIDATES.join(', ')}`,
        );
    }

    return existingSourcePath;
}

function getAdminUiBaseHref(): string {
    return `/${ADMIN_ROUTE.replace(/^\/+|\/+$/g, '')}/`;
}

function resolveGeneratedAngularCliPath(): string {
    const ngCompilerPath = path.join(ADMIN_UI_BUILD_PATH, 'node_modules/@angular/cli/bin/ng.js');
    if (!fs.existsSync(ngCompilerPath)) {
        throw new Error(`Unable to find Angular CLI compiler at ${ngCompilerPath}`);
    }
    return ngCompilerPath;
}

function buildThemeableBrandSvg(sourcePath: string): string {
    let svg = fs
        .readFileSync(sourcePath, 'utf8')
        .replace(/<\?xml[\s\S]*?\?>\s*/i, '')
        .replace(/<!--[\s\S]*?-->\s*/g, '')
        .trim();

    const rootTag = svg.match(/<svg\b[^>]*>/i)?.[0];

    if (!rootTag) {
        throw new Error(`Unable to find root <svg> tag in ${sourcePath}`);
    }

    const themedRootTag = rootTag
        .replace(/\s(?:width|height)="[^"]*"/gi, '')
        .replace(
            '<svg',
            '<svg class="cla-brand-logo-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"',
        );

    svg = svg
        .replace(rootTag, themedRootTag)
        .replace(/fill="#004825"/i, 'fill="var(--brand-logo-bg, transparent)"')
        .replace(/fill="#ffffff"/gi, 'fill="var(--brand-logo-fg, currentColor)"');

    return `${svg}\n`;
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
    // Vendure ships the shell and login templates precompiled with these asset paths.
    // We keep the legacy rasters as compatibility fallbacks while the injected UI layer
    // replaces the visible branding with the inline themeable SVG at runtime.
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
    writeFile(
        path.join(ADMIN_UI_OUTPUT_PATH, 'assets/cla-logo.svg'),
        buildThemeableBrandSvg(resolveBrandLogoSourcePath()),
    );
}

function synchronizeGeneratedAdminUiPackageJson(): void {
    const packageJsonPath = path.join(ADMIN_UI_BUILD_PATH, 'package.json');
    const currentPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
    const nextPackageJson = {
        ...currentPackageJson,
        private: true,
        dependencies: {
            '@vendure/admin-ui': `^${VENDURE_ADMIN_UI_PACKAGE.version}`,
            ...(VENDURE_ADMIN_UI_PACKAGE.dependencies ?? {}),
        },
        devDependencies: {
            ...(currentPackageJson.devDependencies as Record<string, string> | undefined ?? {}),
            ...ADMIN_UI_BUILD_TOOLING,
        },
    };

    fs.writeFileSync(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`, 'utf8');
}

function updateGeneratedAngularWorkspaceConfig(): void {
    const angularJsonPath = path.join(ADMIN_UI_BUILD_PATH, 'angular.json');
    const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8')) as Record<string, unknown>;
    angularJson.cli = {
        ...((angularJson.cli as Record<string, unknown> | undefined) ?? {}),
        packageManager: 'pnpm',
    };
    fs.writeFileSync(angularJsonPath, `${JSON.stringify(angularJson, null, 2)}\n`, 'utf8');
}

function ensureGeneratedAdminUiToolchainInstalled(): Promise<void> {
    const requiredPaths = [
        path.join(ADMIN_UI_BUILD_PATH, 'node_modules/@angular/cli/bin/ng.js'),
        path.join(ADMIN_UI_BUILD_PATH, 'node_modules/@angular-devkit/build-angular/package.json'),
        path.join(ADMIN_UI_BUILD_PATH, 'node_modules/@angular/compiler-cli/package.json'),
        path.join(ADMIN_UI_BUILD_PATH, 'node_modules/@clr/ui/package.json'),
        path.join(ADMIN_UI_BUILD_PATH, 'node_modules/typescript/package.json'),
    ];

    if (requiredPaths.every((requiredPath) => fs.existsSync(requiredPath))) {
        return Promise.resolve();
    }

    return runProcess('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile'], ADMIN_UI_BUILD_PATH);
}

function runProcess(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: true,
            stdio: 'inherit',
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(code);
                return;
            }
            resolve();
        });
    });
}

async function postProcessBuiltAdminUi(): Promise<void> {
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

async function compileGeneratedAdminUi(): Promise<void> {
    await setupScaffold(ADMIN_UI_BUILD_PATH, [ADMIN_UI_EXTENSION]);
    await setBaseHref(ADMIN_UI_BUILD_PATH, getAdminUiBaseHref());
    synchronizeGeneratedAdminUiPackageJson();
    updateGeneratedAngularWorkspaceConfig();
    await ensureGeneratedAdminUiToolchainInstalled();
    await runProcess(
        'node',
        [resolveGeneratedAngularCliPath(), 'build', '--configuration', 'production'],
        ADMIN_UI_BUILD_PATH,
    );
    await postProcessBuiltAdminUi();
}

function getCompiledAdminUiApp(): AdminUiApp {
    return {
        path: ADMIN_UI_OUTPUT_PATH,
        route: ADMIN_ROUTE,
        compile: compileGeneratedAdminUi,
    };
}

export async function buildAdminUi(): Promise<void> {
    fs.rmSync(ADMIN_UI_BUILD_PATH, { recursive: true, force: true });
    const app = getCompiledAdminUiApp();
    await app.compile?.();
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

    return getCompiledAdminUiApp();
}

export const adminUiPaths = {
    buildPath: ADMIN_UI_BUILD_PATH,
    outputPath: ADMIN_UI_OUTPUT_PATH,
    route: ADMIN_ROUTE,
    sourcePath: ADMIN_UI_SOURCE_PATH,
};
