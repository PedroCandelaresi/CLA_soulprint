import {
    ChannelService,
    CountryService,
    CurrencyCode,
    LanguageCode,
    RequestContext,
    RequestContextService,
    ZoneService,
} from '@vendure/core';

type AppWithGet = {
    get<T = unknown>(token: unknown): T;
};

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
    const zoneService = app.get<ZoneService>(ZoneService);

    const ctx = await requestContextService.create({ apiType: 'admin' });
    const defaultChannel = await channelService.getDefaultChannel(ctx);
    const argentinaCountry = await ensureArgentinaCountry(ctx, countryService);
    const argentinaZone = await ensureArgentinaZone(ctx, zoneService, String(argentinaCountry.id));

    const availableLanguageCodes = Array.from(new Set([
        LanguageCode.es,
        ...(defaultChannel.availableLanguageCodes ?? []),
    ]));

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
}
