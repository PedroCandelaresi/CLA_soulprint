import {
    Channel,
    ChannelService,
    CountryService,
    CurrencyCode,
    LanguageCode,
    ProductVariantPrice,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
    ZoneService,
} from '@vendure/core';

type AppWithGet = {
    get<T = unknown>(token: unknown): T;
};

type VariantPriceRow = {
    id: string | number;
    variantId: string | number;
    channelId: string | number;
    price: number;
    deletedAt: string | null;
};

export type EnforceArsCurrencyResult = {
    defaultChannelCode: string;
    defaultChannelId: string;
    orderCount: number;
    availableCurrenciesBefore: CurrencyCode[];
    availableCurrenciesAfter: CurrencyCode[];
    deletedSoftDeletedUsdPriceCount: number;
    deletedDuplicateUsdPriceCount: number;
    totalUsdRowsFound: number;
};

function uniqueLanguageCodes(languageCodes: LanguageCode[]): LanguageCode[] {
    return Array.from(new Set(languageCodes));
}

async function persistDefaultChannelAsArs(
    ctx: RequestContext,
    channelService: ChannelService,
    connection: TransactionalConnection,
): Promise<{ availableCurrenciesBefore: CurrencyCode[]; availableCurrenciesAfter: CurrencyCode[] }> {
    const channelRepository = connection.getRepository(ctx, Channel);
    const defaultChannel = await channelService.getDefaultChannel(ctx);
    const availableCurrenciesBefore = [...(defaultChannel.availableCurrencyCodes ?? [])];

    defaultChannel.defaultLanguageCode = LanguageCode.es;
    defaultChannel.availableLanguageCodes = uniqueLanguageCodes([
        LanguageCode.es,
        ...(defaultChannel.availableLanguageCodes ?? []),
    ]);
    defaultChannel.defaultCurrencyCode = CurrencyCode.ARS;
    defaultChannel.availableCurrencyCodes = [CurrencyCode.ARS];
    defaultChannel.pricesIncludeTax = true;

    await channelRepository.save(defaultChannel);

    return {
        availableCurrenciesBefore,
        availableCurrenciesAfter: [...defaultChannel.availableCurrencyCodes],
    };
}

function mapVariantPriceRows(rows: Array<Record<string, unknown>>): VariantPriceRow[] {
    return rows.map(row => ({
        id: row.id as string | number,
        variantId: row.variantId as string | number,
        channelId: row.channelId as string | number,
        price: Number(row.price),
        deletedAt: row.deletedAt ? String(row.deletedAt) : null,
    }));
}

function variantCurrencyKey(row: Pick<VariantPriceRow, 'variantId' | 'channelId'>): string {
    return `${row.variantId}:${row.channelId}`;
}

async function ensureArgentinaCountry(
    ctx: RequestContext,
    countryService: CountryService,
) {
    const existingCountry = (await countryService.findAll(ctx)).items.find(country => country.code === 'AR');

    if (!existingCountry) {
        return countryService.create(ctx, {
            code: 'AR',
            enabled: true,
            translations: [
                { languageCode: LanguageCode.es, name: 'Argentina' },
                { languageCode: LanguageCode.en, name: 'Argentina' },
            ],
        });
    }

    if (!existingCountry.enabled) {
        return countryService.update(ctx, {
            id: existingCountry.id,
            code: existingCountry.code,
            enabled: true,
        });
    }

    return existingCountry;
}

async function ensureArgentinaZone(
    ctx: RequestContext,
    zoneService: ZoneService,
    countryId: string,
) {
    let zone = (await zoneService.findAll(ctx)).items.find(item => item.name === 'Argentina');

    if (!zone) {
        zone = await zoneService.create(ctx, { name: 'Argentina' });
    }

    const zonesWithMembers = await zoneService.getAllWithMembers(ctx);
    const zoneWithMembers = zonesWithMembers.find(item => item.id === zone.id);
    const hasArgentina = Array.isArray((zoneWithMembers as { members?: Array<{ id?: string; code?: string }> }).members)
        && (zoneWithMembers as { members: Array<{ id?: string; code?: string }> }).members.some(member => member.id === countryId || member.code === 'AR');

    if (!hasArgentina) {
        await zoneService.addMembersToZone(ctx, {
            zoneId: zone.id,
            memberIds: [countryId],
        });
    }

    return zone;
}

export async function ensureArgentinaDefaults(app: AppWithGet): Promise<void> {
    const requestContextService = app.get<RequestContextService>(RequestContextService);
    const channelService = app.get<ChannelService>(ChannelService);
    const countryService = app.get<CountryService>(CountryService);
    const connection = app.get<TransactionalConnection>(TransactionalConnection);
    const zoneService = app.get<ZoneService>(ZoneService);

    const ctx = await requestContextService.create({ apiType: 'admin' });
    const defaultChannel = await channelService.getDefaultChannel(ctx);
    const argentinaCountry = await ensureArgentinaCountry(ctx, countryService);
    const argentinaZone = await ensureArgentinaZone(ctx, zoneService, String(argentinaCountry.id));

    const availableLanguageCodes = uniqueLanguageCodes([
        LanguageCode.es,
        ...(defaultChannel.availableLanguageCodes ?? []),
    ]);

    await channelService.update(ctx, {
        id: defaultChannel.id,
        defaultLanguageCode: LanguageCode.es,
        availableLanguageCodes,
        currencyCode: CurrencyCode.ARS,
        availableCurrencyCodes: [CurrencyCode.ARS],
        pricesIncludeTax: true,
        defaultTaxZoneId: argentinaZone.id,
        defaultShippingZoneId: argentinaZone.id,
    });

    await persistDefaultChannelAsArs(ctx, channelService, connection);
}

export async function enforceArsCurrencyState(app: AppWithGet): Promise<EnforceArsCurrencyResult> {
    const requestContextService = app.get<RequestContextService>(RequestContextService);
    const channelService = app.get<ChannelService>(ChannelService);
    const connection = app.get<TransactionalConnection>(TransactionalConnection);
    const ctx = await requestContextService.create({ apiType: 'admin' });

    await ensureArgentinaDefaults(app);

    return connection.withTransaction(ctx, async txCtx => {
        const manager = connection.getRepository(txCtx, ProductVariantPrice).manager;
        const defaultChannel = await channelService.getDefaultChannel(txCtx);
        const channelNormalization = await persistDefaultChannelAsArs(txCtx, channelService, connection);

        const [{ totalOrders }] = (await manager.query('SELECT COUNT(*) AS totalOrders FROM `order`')) as Array<Record<string, unknown>>;
        const usdRows = mapVariantPriceRows(await manager.query(
            `
                SELECT pvp.id, pvp.variantId, pvp.channelId, pvp.price, pv.deletedAt
                FROM product_variant_price pvp
                LEFT JOIN product_variant pv ON pv.id = pvp.variantId
                WHERE pvp.currencyCode = ?
            `,
            [CurrencyCode.USD],
        ));

        const softDeletedUsdRows = usdRows.filter(row => row.deletedAt !== null);
        const activeUsdRows = usdRows.filter(row => row.deletedAt === null);
        const duplicateActiveUsdIds: Array<string | number> = [];

        if (activeUsdRows.length > 0) {
            const variantIds = Array.from(new Set(activeUsdRows.map(row => row.variantId)));
            const arsPlaceholders = variantIds.map(() => '?').join(', ');
            const arsCompanionRows = variantIds.length
                ? mapVariantPriceRows(await manager.query(
                    `
                        SELECT id, variantId, channelId, price, NULL AS deletedAt
                        FROM product_variant_price
                        WHERE currencyCode = ? AND variantId IN (${arsPlaceholders})
                    `,
                    [CurrencyCode.ARS, ...variantIds],
                ))
                : [];
            const arsCompanionKeys = new Set(arsCompanionRows.map(row => variantCurrencyKey(row)));
            const blockingUsdRows = activeUsdRows.filter(row => !arsCompanionKeys.has(variantCurrencyKey(row)));

            if (blockingUsdRows.length > 0) {
                const blockingSummary = blockingUsdRows
                    .map(row => `variant=${row.variantId}, channel=${row.channelId}, price=${row.price}`)
                    .join('; ');

                throw new Error(
                    `Found active USD prices without ARS counterpart. Manual pricing decision required before cleanup: ${blockingSummary}`,
                );
            }

            duplicateActiveUsdIds.push(
                ...activeUsdRows
                    .filter(row => arsCompanionKeys.has(variantCurrencyKey(row)))
                    .map(row => row.id),
            );
        }

        const idsToDelete = [
            ...softDeletedUsdRows.map(row => row.id),
            ...duplicateActiveUsdIds,
        ];

        if (idsToDelete.length > 0) {
            const deletePlaceholders = idsToDelete.map(() => '?').join(', ');

            await manager.query(
                `DELETE FROM product_variant_price WHERE id IN (${deletePlaceholders})`,
                idsToDelete,
            );
        }

        return {
            defaultChannelCode: defaultChannel.code,
            defaultChannelId: String(defaultChannel.id),
            orderCount: Number(totalOrders ?? 0),
            availableCurrenciesBefore: channelNormalization.availableCurrenciesBefore,
            availableCurrenciesAfter: channelNormalization.availableCurrenciesAfter,
            deletedSoftDeletedUsdPriceCount: softDeletedUsdRows.length,
            deletedDuplicateUsdPriceCount: duplicateActiveUsdIds.length,
            totalUsdRowsFound: usdRows.length,
        };
    });
}
