import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
    Ctx,
    LanguageCode,
    PaymentMethodService,
    PluginCommonModule,
    RequestContext,
    VendurePlugin,
    type PluginConfigurationFn,
} from '@vendure/core';
import { gql } from 'graphql-tag';

type PaymentMethodQuoteLike = {
    id: string | number;
    code?: string;
    name?: string;
    description?: string;
};

type StorefrontPaymentDisplay = {
    sectionTitle: string | null;
    footerText: string | null;
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
        'storefrontSectionTitle',
        'string',
        'Título de sección en tienda',
        'Texto superior del selector de pagos. Si queda vacío, el storefront no muestra título.',
    );
    addPaymentDisplayField(
        paymentMethodFields,
        'storefrontFooterText',
        'text',
        'Texto inferior en tienda',
        'Nota opcional debajo del botón de pago.',
    );
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
            sectionTitle: text(customFields.storefrontSectionTitle),
            footerText: text(customFields.storefrontFooterText),
            title,
            cardDescription,
            instructionsTitle: text(customFields.storefrontInstructionsTitle),
            instructions: text(customFields.storefrontInstructions),
            buttonLabel: text(customFields.storefrontButtonLabel) ?? title,
            icon: text(customFields.storefrontIcon),
        };
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: gql`
            type StorefrontPaymentMethodDisplay {
                sectionTitle: String
                footerText: String
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
        `,
        resolvers: [StorefrontPaymentMethodQuoteResolver],
    },
    providers: [StorefrontPaymentMethodQuoteResolver],
    configuration: configurationHook,
})
export class StorefrontPaymentDisplayPlugin {}
