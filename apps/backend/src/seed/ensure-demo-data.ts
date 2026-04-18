import {
    ChannelService,
    FacetService,
    FacetValueService,
    CountryService,
    CurrencyCode,
    LanguageCode,
    ProductService,
    ProductVariantService,
    RequestContextService,
    ShippingMethodService,
    TaxCategoryService,
    TaxRateService,
    ZoneService,
    defaultShippingCalculator,
    defaultShippingEligibilityChecker,
} from '@vendure/core';

const DEMO_PRODUCT_SLUG = 'producto-demo';
const DEMO_PRODUCT_SKU = 'DEMO-001';
const DEMO_SHIPPING_METHOD_CODE = 'envio-demo';
const DEMO_PRODUCT_NAME = 'Producto Demo';
const DEMO_PRODUCT_DESCRIPTION = 'Un producto demo listo para probar carrito y checkout.';
const DEMO_PRODUCT_PRICE = 1000;
const DEMO_PRODUCT_STOCK = 100;
const DEMO_PRODUCT_FACET_CODE = 'etiquetas-demo';
const DEMO_FEATURED_FACET_VALUE_CODE = 'destacado';

function getDemoShippingMethodInput() {
    return {
        fulfillmentHandler: 'manual-fulfillment',
        checker: {
            code: defaultShippingEligibilityChecker.code,
            arguments: [{ name: 'orderMinimum', value: '0' }],
        },
        calculator: {
            code: defaultShippingCalculator.code,
            arguments: [
                { name: 'rate', value: '1500' },
                { name: 'includesTax', value: 'auto' },
                { name: 'taxRate', value: '21' },
            ],
        },
        translations: [
            {
                languageCode: LanguageCode.es,
                name: 'Envio demo',
                description: 'Entrega coordinada para la demo.',
            },
        ],
    };
}

function getDemoProductTranslation() {
    return {
        languageCode: LanguageCode.es,
        name: DEMO_PRODUCT_NAME,
        slug: DEMO_PRODUCT_SLUG,
        description: DEMO_PRODUCT_DESCRIPTION,
    };
}

function getDemoVariantTranslation() {
    return {
        languageCode: LanguageCode.es,
        name: DEMO_PRODUCT_NAME,
    };
}

export type DemoBootstrapSummary = {
    created: string[];
    existing: string[];
};

async function createAdminContext(
    requestContextService: RequestContextService,
    channelService: ChannelService,
) {
    const channel = await channelService.getDefaultChannel();

    return requestContextService.create({
        apiType: 'admin',
        channelOrToken: channel.token,
        languageCode: LanguageCode.es,
        currencyCode: CurrencyCode.ARS,
    });
}

export async function ensureDemoData(app: {
    get<T>(token: new (...args: never[]) => T): T;
}): Promise<DemoBootstrapSummary> {
    const channelService = app.get(ChannelService);
    const productVariantService = app.get(ProductVariantService);
    const productService = app.get(ProductService);
    const facetService = app.get(FacetService);
    const facetValueService = app.get(FacetValueService);
    const taxCategoryService = app.get(TaxCategoryService);
    const requestContextService = app.get(RequestContextService);
    const zoneService = app.get(ZoneService);
    const taxRateService = app.get(TaxRateService);
    const countryService = app.get(CountryService);
    const shippingMethodService = app.get(ShippingMethodService);
    const summary: DemoBootstrapSummary = {
        created: [],
        existing: [],
    };

    let ctx = await createAdminContext(requestContextService, channelService);
    const channel = await channelService.getDefaultChannel();

    await channelService.update(ctx, {
        id: channel.id,
        defaultLanguageCode: LanguageCode.es,
        availableLanguageCodes: [LanguageCode.es],
        currencyCode: CurrencyCode.ARS,
        availableCurrencyCodes: [CurrencyCode.ARS],
        pricesIncludeTax: true,
    });

    let country = (await countryService.findAll(ctx)).items.find((item) => item.code === 'AR');
    if (!country) {
        country = await countryService.create(ctx, {
            code: 'AR',
            enabled: true,
            translations: [{ languageCode: LanguageCode.es, name: 'Argentina' }],
        });
        summary.created.push('country:AR');
    } else {
        summary.existing.push('country:AR');
    }

    let zone = (await zoneService.findAll(ctx)).items.find((item) => item.name === 'Argentina');
    if (!zone) {
        zone = await zoneService.create(ctx, { name: 'Argentina' });
        await zoneService.addMembersToZone(ctx, { zoneId: zone.id, memberIds: [country.id] });
        summary.created.push('zone:Argentina');
    } else {
        summary.existing.push('zone:Argentina');
    }

    await channelService.update(ctx, {
        id: channel.id,
        defaultTaxZoneId: zone.id,
        defaultShippingZoneId: zone.id,
    });

    ctx = await createAdminContext(requestContextService, channelService);

    let taxCategory = (await taxCategoryService.findAll(ctx)).items.find(
        (item) => item.name === 'Impuesto estandar',
    );
    if (!taxCategory) {
        taxCategory = await taxCategoryService.create(ctx, { name: 'Impuesto estandar' });
        summary.created.push('tax-category:Impuesto estandar');
    } else {
        summary.existing.push('tax-category:Impuesto estandar');
    }

    const taxRate = (await taxRateService.findAll(ctx)).items.find((item) => item.name === 'IVA 21%');
    if (!taxRate) {
        await taxRateService.create(ctx, {
            name: 'IVA 21%',
            enabled: true,
            value: 21,
            categoryId: taxCategory.id,
            zoneId: zone.id,
        });
        summary.created.push('tax-rate:IVA 21%');
    } else {
        summary.existing.push('tax-rate:IVA 21%');
    }

    let demoFacet = await facetService.findByCode(ctx, DEMO_PRODUCT_FACET_CODE, LanguageCode.es);
    if (!demoFacet) {
        demoFacet = await facetService.create(ctx, {
            code: DEMO_PRODUCT_FACET_CODE,
            isPrivate: false,
            translations: [
                {
                    languageCode: LanguageCode.es,
                    name: 'Etiquetas demo',
                },
            ],
        });
        summary.created.push('facet:etiquetas-demo');
    } else {
        summary.existing.push('facet:etiquetas-demo');
    }

    const demoFacetValues = await facetValueService.findByFacetId(ctx, demoFacet.id);
    let featuredFacetValue = demoFacetValues.find((item) => item.code === DEMO_FEATURED_FACET_VALUE_CODE);

    if (!featuredFacetValue) {
        featuredFacetValue = await facetValueService.create(ctx, demoFacet, {
            code: DEMO_FEATURED_FACET_VALUE_CODE,
            translations: [
                {
                    languageCode: LanguageCode.es,
                    name: 'Destacado',
                },
            ],
        });
        summary.created.push('facet-value:destacado');
    } else {
        summary.existing.push('facet-value:destacado');
    }

    const shippingMethod = (await shippingMethodService.findAll(ctx)).items.find(
        (item) => item.code === DEMO_SHIPPING_METHOD_CODE,
    );
    if (!shippingMethod) {
        await shippingMethodService.create(ctx, {
            code: DEMO_SHIPPING_METHOD_CODE,
            ...getDemoShippingMethodInput(),
        });
        summary.created.push('shipping-method:envio-demo');
    } else {
        await shippingMethodService.update(ctx, {
            id: shippingMethod.id,
            ...getDemoShippingMethodInput(),
        });
        summary.existing.push('shipping-method:envio-demo(updated)');
    }

    let demoProduct = await productService.findOneBySlug(ctx, DEMO_PRODUCT_SLUG);

    if (!demoProduct) {
        demoProduct = await productService.create(ctx, {
            translations: [getDemoProductTranslation()],
            enabled: true,
            facetValueIds: [featuredFacetValue.id],
        });
        summary.created.push('product:producto-demo');
    } else {
        demoProduct = await productService.update(ctx, {
            id: demoProduct.id,
            enabled: true,
            translations: [getDemoProductTranslation()],
            facetValueIds: [featuredFacetValue.id],
        });
        summary.existing.push('product:producto-demo(updated)');
    }

    const demoVariants = await productVariantService.getVariantsByProductId(ctx, demoProduct.id);
    const demoVariant = demoVariants.items.find((item) => item.sku === DEMO_PRODUCT_SKU) ?? demoVariants.items[0];

    if (!demoVariant) {
        const [createdVariant] = await productVariantService.create(ctx, [
            {
                productId: demoProduct.id,
                sku: DEMO_PRODUCT_SKU,
                price: DEMO_PRODUCT_PRICE,
                translations: [getDemoVariantTranslation()],
                taxCategoryId: taxCategory.id,
                stockOnHand: DEMO_PRODUCT_STOCK,
                facetValueIds: [featuredFacetValue.id],
            },
        ]);

        await productVariantService.createOrUpdateProductVariantPrice(
            ctx,
            createdVariant.id,
            DEMO_PRODUCT_PRICE,
            channel.id,
            CurrencyCode.ARS,
        );
        summary.created.push('product-variant:producto-demo');
    } else {
        const [updatedVariant] = await productVariantService.update(ctx, [
            {
                id: demoVariant.id,
                sku: DEMO_PRODUCT_SKU,
                price: DEMO_PRODUCT_PRICE,
                translations: [getDemoVariantTranslation()],
                taxCategoryId: taxCategory.id,
                stockOnHand: DEMO_PRODUCT_STOCK,
                facetValueIds: [featuredFacetValue.id],
            },
        ]);

        await productVariantService.createOrUpdateProductVariantPrice(
            ctx,
            updatedVariant.id,
            DEMO_PRODUCT_PRICE,
            channel.id,
            CurrencyCode.ARS,
        );
        summary.existing.push('product-variant:producto-demo(updated)');
    }

    return summary;
}
