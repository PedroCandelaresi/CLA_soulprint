import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
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

type PaymentMethodQuoteLike = { id: string | number };

const configurationHook: PluginConfigurationFn = config => {
    config.customFields = config.customFields ?? {};
    const fields = ((config.customFields as any).PaymentMethod ?? []) as any[];
    if (!fields.some((f: any) => f.name === 'icon')) {
        fields.push({
            name: 'icon',
            type: 'string',
            public: true,
            nullable: true,
            label: [{ languageCode: LanguageCode.es, value: 'Ícono en checkout' }],
            description: [{ languageCode: LanguageCode.es, value: 'Clave de ícono para el selector de pago: bank, card, cash, wallet, payment. Si queda vacío se usa el fallback por código.' }],
        });
    }
    (config.customFields as any).PaymentMethod = fields;
    return config;
};

@Resolver('PaymentMethodQuote')
export class PaymentMethodIconResolver {
    constructor(private readonly paymentMethodService: PaymentMethodService) {}

    @ResolveField()
    @Allow(Permission.Public)
    async icon(
        @Ctx() ctx: RequestContext,
        @Parent() quote: PaymentMethodQuoteLike,
    ): Promise<string | null> {
        const method = await this.paymentMethodService.findOne(ctx, quote.id);
        const icon = (method?.customFields as Record<string, unknown> | undefined)?.icon;
        return typeof icon === 'string' && icon.trim() ? icon.trim() : null;
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: gql`
            extend type PaymentMethodQuote {
                icon: String
            }
        `,
        resolvers: [PaymentMethodIconResolver],
    },
    configuration: configurationHook,
})
export class PaymentMethodIconPlugin {}
