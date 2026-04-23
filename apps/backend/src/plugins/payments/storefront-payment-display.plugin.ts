import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    LanguageCode,
    PaymentMethodService,
    Permission,
    PluginCommonModule,
    RequestContext,
    VendurePlugin,
    type PluginConfigurationFn,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import {
    StorefrontPaymentDisplayService,
    type UpdateStorefrontPaymentSettingsInput,
    type UpdatePaymentMethodDisplayInput,
} from './storefront-payment-display.service';
import { StorefrontPaymentSettings } from './storefront-payment-settings.entity';

type PaymentMethodQuoteLike = {
    id: string | number;
    code?: string;
    name?: string;
    description?: string;
};

type StorefrontPaymentDisplay = {
    title: string;
    cardDescription: string;
    instructionsTitle: string | null;
    instructions: string | null;
    buttonLabel: string;
    icon: string | null;
};

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function addPaymentDisplayField(
    fields: any[],
    name: string,
    type: 'string' | 'text',
    label: string,
    description: string,
): void {
    if (fields.some(field => field.name === name)) {
        return;
    }

    fields.push({
        name,
        type,
        public: true,
        nullable: true,
        label: [{ languageCode: LanguageCode.es, value: label }],
        description: [{ languageCode: LanguageCode.es, value: description }],
    });
}

const configurationHook: PluginConfigurationFn = config => {
    config.customFields = config.customFields ?? {};
    const paymentMethodFields = ((config.customFields as any).PaymentMethod ?? []) as any[];

    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontTitle',
        'string',
        'Título de card en tienda',
        'Título visible en la card del método de pago. Si queda vacío, usa el nombre del método.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontCardDescription',
        'text',
        'Descripción de card en tienda',
        'Descripción visible en la card. Si queda vacía, usa la descripción del método.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontInstructionsTitle',
        'string',
        'Título de instrucciones en tienda',
        'Título del bloque desplegado al seleccionar este método.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontInstructions',
        'text',
        'Instrucciones en tienda',
        'Texto completo del bloque desplegado al seleccionar este método, por ejemplo CBU/CVU, alias, CUIT o aclaraciones.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontButtonLabel',
        'string',
        'Texto del botón en tienda',
        'Texto exacto del botón principal cuando este método está seleccionado. Si queda vacío, usa el nombre del método.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontIcon',
        'string',
        'Ícono en tienda',
        'Clave visual opcional: card, bank, cash, wallet o payment.',
    );

    (config.customFields as any).PaymentMethod = paymentMethodFields;
    return config;
};

@Resolver('PaymentMethodQuote')
export class StorefrontPaymentMethodQuoteResolver {
    constructor(private readonly paymentMethodService: PaymentMethodService) {}

    @ResolveField()
    async storefrontDisplay(
        @Ctx() ctx: RequestContext,
        @Parent() quote: PaymentMethodQuoteLike,
    ): Promise<StorefrontPaymentDisplay> {
        const method = await this.paymentMethodService.findOne(ctx, quote.id);
        const customFields = (method?.customFields ?? {}) as Record<string, unknown>;
        const title = text(customFields.storefrontTitle) ?? text(quote.name) ?? '';
        const cardDescription = text(customFields.storefrontCardDescription) ?? text(quote.description) ?? '';

        return {
            title,
            cardDescription,
            instructionsTitle: text(customFields.storefrontInstructionsTitle),
            instructions: text(customFields.storefrontInstructions),
            buttonLabel: text(customFields.storefrontButtonLabel) ?? title,
            icon: text(customFields.storefrontIcon),
        };
    }
}

@Resolver()
export class StorefrontPaymentSettingsResolver {
    constructor(private readonly service: StorefrontPaymentDisplayService) {}

    @Query()
    @Allow(Permission.Public)
    storefrontPaymentSettings(@Ctx() ctx: RequestContext): Promise<StorefrontPaymentSettings> {
        return this.service.getSettings(ctx);
    }
}

@Resolver()
export class StorefrontPaymentSettingsAdminResolver {
    constructor(private readonly service: StorefrontPaymentDisplayService) {}

    @Query()
    @Allow(Permission.Public)
    storefrontPaymentSettings(@Ctx() ctx: RequestContext): Promise<StorefrontPaymentSettings> {
        return this.service.getSettings(ctx);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings, Permission.UpdatePaymentMethod)
    updateStorefrontPaymentSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateStorefrontPaymentSettingsInput,
    ): Promise<StorefrontPaymentSettings> {
        return this.service.updateSettings(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdatePaymentMethod)
    updatePaymentMethodDisplay(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdatePaymentMethodDisplayInput,
    ): Promise<boolean> {
        return this.service.updatePaymentMethodDisplay(ctx, input);
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [StorefrontPaymentSettings],
    adminApiExtensions: {
        schema: gql`
            type StorefrontPaymentSettings {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                sectionTitle: String
                footerText: String
            }

            input UpdateStorefrontPaymentSettingsInput {
                sectionTitle: String
                footerText: String
            }

            input UpdatePaymentMethodDisplayInput {
                id: ID!
                storefrontTitle: String
                storefrontCardDescription: String
                storefrontInstructionsTitle: String
                storefrontInstructions: String
                storefrontButtonLabel: String
                storefrontIcon: String
            }

            extend type Query {
                storefrontPaymentSettings: StorefrontPaymentSettings!
            }

            extend type Mutation {
                updateStorefrontPaymentSettings(input: UpdateStorefrontPaymentSettingsInput!): StorefrontPaymentSettings!
                updatePaymentMethodDisplay(input: UpdatePaymentMethodDisplayInput!): Boolean!
            }
        `,
        resolvers: [StorefrontPaymentSettingsAdminResolver],
    },
    shopApiExtensions: {
        schema: gql`
            type StorefrontPaymentSettings {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                sectionTitle: String
                footerText: String
            }

            type StorefrontPaymentMethodDisplay {
                title: String!
                cardDescription: String!
                instructionsTitle: String
                instructions: String
                buttonLabel: String!
                icon: String
            }

            extend type PaymentMethodQuote {
                storefrontDisplay: StorefrontPaymentMethodDisplay!
            }

            extend type Query {
                storefrontPaymentSettings: StorefrontPaymentSettings!
            }
        `,
        resolvers: [StorefrontPaymentMethodQuoteResolver, StorefrontPaymentSettingsResolver],
    },
    providers: [StorefrontPaymentDisplayService],
    configuration: configurationHook,
})
export class StorefrontPaymentDisplayPlugin {}
