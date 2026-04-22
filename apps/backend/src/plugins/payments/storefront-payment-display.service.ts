import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { StorefrontPaymentSettings } from './storefront-payment-settings.entity';

export interface UpdateStorefrontPaymentSettingsInput {
    sectionTitle?: string | null;
    footerText?: string | null;
}

@Injectable()
export class StorefrontPaymentDisplayService {
    constructor(private readonly connection: TransactionalConnection) {}

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
}

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}
