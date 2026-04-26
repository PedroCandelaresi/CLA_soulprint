import { LanguageCode, PluginCommonModule, VendurePlugin, type PluginConfigurationFn } from '@vendure/core';
import {
    getPersonalizationConfigFromEnv,
    PERSONALIZATION_CONFIG_OPTIONS,
} from './personalization.config';
import { PersonalizationController } from './personalization.controller';
import { PersonalizationService } from './personalization.service';
import {
    PERSONALIZATION_PSP_RESOLVER,
    NoopPersonalizationPspResolver,
} from './adapters/psp-resolver';
import { MercadoPagoPersonalizationPspResolver } from './adapters/mercadopago-psp-resolver';

const configurationHook: PluginConfigurationFn = config => {
    config.customFields = config.customFields ?? {};

    const existingOrderFields = config.customFields.Order ?? [];
    if (!existingOrderFields.some(f => f.name === 'personalizationOverallStatus')) {
        existingOrderFields.push({
            name: 'personalizationOverallStatus',
            type: 'string',
            defaultValue: 'not-required',
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Estado global de personalización' }],
        });
    }
    config.customFields.Order = existingOrderFields;

    const existingOrderLineFields = config.customFields.OrderLine ?? [];
    const orderLineFieldsToAdd = [
        // ── Modo de personalización (se establece al agregar al carrito) ──
        {
            name: 'frontMode',
            type: 'string' as const,
            public: true,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Modo frente' }],
            description: [{ languageCode: LanguageCode.es, value: '"text" o "image". Se configura en el checkout.' }],
        },
        {
            name: 'frontText',
            type: 'text' as const,
            public: true,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Texto del frente' }],
        },
        {
            name: 'backMode',
            type: 'string' as const,
            public: true,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Modo dorso' }],
            description: [{ languageCode: LanguageCode.es, value: '"none", "text" o "image". Se configura en el checkout.' }],
        },
        {
            name: 'backText',
            type: 'text' as const,
            public: true,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Texto del dorso' }],
        },
        // ── Estado y assets (se establecen post-pago) ──
        {
            name: 'personalizationStatus',
            type: 'string' as const,
            defaultValue: 'not-required',
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Estado personalización frente' }],
        },
        {
            name: 'personalizationAsset',
            type: 'relation' as const,
            entity: require('@vendure/core').Asset,
            graphQLType: 'Asset',
            public: false,
            nullable: true,
            eager: true,
            label: [{ languageCode: LanguageCode.es, value: 'Imagen frente' }],
        },
        {
            name: 'personalizationBackStatus',
            type: 'string' as const,
            defaultValue: 'not-required',
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Estado personalización dorso' }],
        },
        {
            name: 'personalizationBackAsset',
            type: 'relation' as const,
            entity: require('@vendure/core').Asset,
            graphQLType: 'Asset',
            public: false,
            nullable: true,
            eager: true,
            label: [{ languageCode: LanguageCode.es, value: 'Imagen dorso' }],
        },
        {
            name: 'personalizationNotes',
            type: 'text' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Notas de personalización' }],
        },
        {
            name: 'personalizationUploadedAt',
            type: 'datetime' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Fecha de subida frente' }],
        },
        {
            name: 'personalizationBackUploadedAt',
            type: 'datetime' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Fecha de subida dorso' }],
        },
        {
            name: 'personalizationApprovedAt',
            type: 'datetime' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Fecha de aprobación' }],
        },
        {
            name: 'personalizationRejectedReason',
            type: 'string' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Motivo de rechazo' }],
        },
        {
            name: 'personalizationSnapshotFileName',
            type: 'string' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Nombre archivo frente' }],
        },
        {
            name: 'personalizationBackSnapshotFileName',
            type: 'string' as const,
            public: false,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Nombre archivo dorso' }],
        },
    ];
    for (const field of orderLineFieldsToAdd) {
        if (!existingOrderLineFields.some(f => f.name === field.name)) {
            existingOrderLineFields.push(field as any);
        }
    }
    config.customFields.OrderLine = existingOrderLineFields;

    const existingVariantFields = config.customFields.ProductVariant ?? [];
    if (!existingVariantFields.some(f => f.name === 'requiresPersonalization')) {
        existingVariantFields.push({
            name: 'requiresPersonalization',
            type: 'boolean',
            defaultValue: true,
            public: true,
            nullable: false,
            label: [{ languageCode: LanguageCode.es, value: 'Requiere personalización' }],
            description: [
                {
                    languageCode: LanguageCode.es,
                    value: 'Marcá esta opción si la variante necesita que el cliente suba un archivo tras el pago.',
                },
            ],
        });
    }
    config.customFields.ProductVariant = existingVariantFields;

    return config;
};

@VendurePlugin({
    compatibility: '^2.0.0',
    imports: [PluginCommonModule],
    controllers: [PersonalizationController],
    providers: [
        {
            provide: PERSONALIZATION_CONFIG_OPTIONS,
            useValue: getPersonalizationConfigFromEnv(),
        },
        MercadoPagoPersonalizationPspResolver,
        {
            provide: PERSONALIZATION_PSP_RESOLVER,
            useExisting: MercadoPagoPersonalizationPspResolver,
        },
        PersonalizationService,
    ],
    configuration: configurationHook,
})
export class PersonalizationPlugin {}

export {
    PERSONALIZATION_PSP_RESOLVER,
    NoopPersonalizationPspResolver,
    type PersonalizationPspResolver,
    type PersonalizationPspTransaction,
} from './adapters/psp-resolver';
export * from './personalization.config';
export * from './personalization.controller';
export * from './personalization.service';
export * from './personalization.types';
export * from './personalization.event';
