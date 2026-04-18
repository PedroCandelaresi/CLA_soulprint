import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

const brandingDir = path.join(__dirname, '../../../static/admin-ui-branding');

export const BadgesUiExtension: AdminUiExtension = {
    id: 'badges-ui-extension',
    extensionPath: path.join(__dirname, 'ui'),
    ngModules: [
        {
            type: 'lazy',
            route: 'badges',
            ngModuleFileName: 'badges.module.ts',
            ngModuleName: 'BadgesModule',
        },
    ],
    providers: ['providers.ts'],
    globalStyles: [path.join(brandingDir, 'admin-ui-branding.css')],
    staticAssets: [
        {
            path: path.join(brandingDir, 'admin-login-hero.svg'),
            rename: 'assets/admin-login-hero.svg',
        },
        {
            path: path.join(brandingDir, 'marca-ejemplo.svg'),
            rename: 'assets/marca-ejemplo.svg',
        },
    ],
};
