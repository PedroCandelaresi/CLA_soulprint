import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import {
    getPersonalizationConfigFromEnv,
    PERSONALIZATION_CONFIG_OPTIONS,
} from './personalization.config';
import { PersonalizationController } from './personalization.controller';
import { PersonalizationService } from './personalization.service';

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    controllers: [PersonalizationController],
    providers: [
        {
            provide: PERSONALIZATION_CONFIG_OPTIONS,
            useValue: getPersonalizationConfigFromEnv(),
        },
        PersonalizationService,
    ],
})
export class PersonalizationPlugin {}

export * from './personalization.config';
export * from './personalization.controller';
export * from './personalization.service';
export * from './personalization.types';
