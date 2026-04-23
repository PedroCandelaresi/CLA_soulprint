import { Injectable } from '@nestjs/common';
import { PaymentMethodService, RequestContext, TransactionalConnection } from '@vendure/core';
import { StorefrontPaymentSettings } from './storefront-payment-settings.entity';

export interface UpdatePaymentMethodDisplayInput {
    id: string;
    storefrontTitle?: string | null;
    storefrontCardDescription?: string | null;
    storefrontInstructionsTitle?: string | null;
    storefrontInstructions?: string | null;
    storefrontButtonLabel?: string | null;
    storefrontIcon?: string | null;
}

export interface UpdateStorefrontPaymentSettingsInput {
    sectionTitle?: string | null;
    footerText?: string | null;
}

@Injectable()
export class StorefrontPaymentDisplayService {
    constructor(
        private readonly connection: TransactionalConnection,
        private readonly paymentMethodService: PaymentMethodService,
    ) {}

    async getSettings(ctx: RequestContext): Promise<StorefrontPaymentSettings> {
        const repo = this.connection.getRepository(ctx, StorefrontPaymentSettings);
        const existing = await repo.findOne({ where: {}, order: { id: 'ASC' } });
        if (existing) return existing;

        return repo.save(new StorefrontPaymentSettings({}));
    }

    async updateSettings(
        ctx: RequestContext,
        input: UpdateStorefrontPaymentSettingsInput,
    ): Promise<StorefrontPaymentSettings> {
        const repo = this.connection.getRepository(ctx, StorefrontPaymentSettings);
        const settings = await this.getSettings(ctx);

        if (Object.prototype.hasOwnProperty.call(input, 'sectionTitle')) {
            settings.sectionTitle = normalizeNullableString(input.sectionTitle) ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(input, 'footerText')) {
            settings.footerText = normalizeNullableString(input.footerText) ?? null;
        }

        return repo.save(settings);
    }

    async updatePaymentMethodDisplay(
        ctx: RequestContext,
        input: UpdatePaymentMethodDisplayInput,
    ): Promise<boolean> {
        const { id, ...fields } = input;
        await this.paymentMethodService.update(ctx, {
            id,
            customFields: fields as any,
        });
        return true;
    }
}

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}
