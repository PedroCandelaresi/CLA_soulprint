import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { createGoogleAuthConfigProvider, GoogleAuthService } from './google-auth.service';

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    providers: [
        createGoogleAuthConfigProvider(),
        GoogleAuthService,
    ],
})
export class GoogleAuthPlugin {}

export * from './google-auth.config';
export * from './google-auth.service';
export * from './google-auth.strategy';
