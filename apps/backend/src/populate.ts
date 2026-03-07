import { bootstrap, VendureConfig, LanguageCode, CurrencyCode } from '@vendure/core';
import { ChannelService, ProductService, ProductVariantService, TaxCategoryService, ShippingMethodService, RequestContextService, ZoneService, TaxRateService, CountryService } from '@vendure/core';
import { config } from './vendure-config';

// Define initial data
const initialData = {
    defaultLanguage: 'en',
    defaultZone: 'Europe',
    taxRates: [
        { name: 'Standard Tax', percentage: 20 },
    ],
    shippingMethods: [
        { name: 'Standard Shipping', price: 500 },
    ],
    paymentMethods: [
        { name: 'Standard Payment', handler: { code: 'dummy-payment-handler', arguments: [] } }
    ],
    collections: [
        {
            name: 'Electronics',
            slug: 'electronics',
            filters: [{ code: 'facet-value-filter', arguments: [{ name: 'facetValueIds', value: '[]' }] }],
        },
    ],
};

const productsCsv = `
name,slug,description,assets,facets,optionGroups,optionValues,price,taxCategory,stockOnHand,trackInventory
"Laptop Gamer","laptop-gamer","A powerful gaming laptop","","electronics","","","150000","Standard Tax",100,true
`;

// Helper to create basic seed
// In a real scenario we would import from @vendure/core/cli related utils or use a prepared buffer
// For simplicity in this prompt context, we will skip complex CSV logic if not provided by library easily,
// but populate() usually takes a simple object for core config.
// Since populate() requires specific data structure, we will just bootstrap and use service layer to add a product if empty.

async function seed() {
    const app = await bootstrap(config);

    // Services
    const channelService = app.get(ChannelService);
    const productVariantService = app.get(ProductVariantService);
    const productService = app.get(ProductService);
    const taxCategoryService = app.get(TaxCategoryService);
    const requestContextService = app.get(RequestContextService);

    console.log('Creating request context...');
    const channel = await channelService.getDefaultChannel();
    const ctx = await requestContextService.create({
        apiType: 'admin',
    });

    // Update Channel to Argentina defaults
    await channelService.update(ctx, {
        id: channel.id,
        defaultLanguageCode: LanguageCode.es,
        availableLanguageCodes: [LanguageCode.es, LanguageCode.en],
        currencyCode: CurrencyCode.ARS,
        availableCurrencyCodes: [CurrencyCode.ARS, CurrencyCode.USD],
        pricesIncludeTax: true,
    });
    console.log('Channel updated to ARS/ES');

    // Check if product exists
    const products = await productService.findAll(ctx, {});

    // Ensure Zone and Tax Rate
    const zoneService = app.get(ZoneService);
    const taxRateService = app.get(TaxRateService);
    const countryService = app.get(CountryService);

    // Create 'Argentina' country if not exists
    let country = (await countryService.findAll(ctx)).items.find(c => c.code === 'AR');
    if (!country) {
        country = await countryService.create(ctx, { code: 'AR', enabled: true, translations: [{ languageCode: LanguageCode.es, name: 'Argentina' }] });
        console.log('Created Country: Argentina');
    }

    // Create 'Argentina' zone if not exists
    let zone = (await zoneService.findAll(ctx)).items.find(z => z.name === 'Argentina');
    if (!zone) {
        zone = await zoneService.create(ctx, { name: 'Argentina' });
        await zoneService.addMembersToZone(ctx, { zoneId: zone.id, memberIds: [country.id] });
        console.log('Created Zone: Argentina');
    }

    // Set Default Tax Zone for Channel
    await channelService.update(ctx, {
        id: channel.id,
        defaultTaxZoneId: zone.id,
        defaultShippingZoneId: zone.id,
    });
    console.log('Set Channel Default Tax Zone to Argentina');

    if (products.items.length === 0) {
        console.log('Seeding initial product...');
        let taxCategory = (await taxCategoryService.findAll(ctx)).items[0];
        if (!taxCategory) {
            taxCategory = await taxCategoryService.create(ctx, { name: 'Standard Tax' });
        }

        // Create Tax Rate
        const taxRate = (await taxRateService.findAll(ctx)).items.find(tr => tr.name === 'IVA 21%');
        if (!taxRate) {
            await taxRateService.create(ctx, {
                name: 'IVA 21%',
                enabled: true,
                value: 21,
                categoryId: taxCategory.id,
                zoneId: zone.id,
            });
            console.log('Created Tax Rate: IVA 21%');
        }

        const createdProduct = await productService.create(ctx, {
            translations: [{ languageCode: channel.defaultLanguageCode, name: 'Demo Product', slug: 'demo-product', description: 'A great demo product' }],
            enabled: true,
        });

        if (createdProduct && 'id' in createdProduct) {
            // Create variant
            await productVariantService.create(ctx, [{
                productId: createdProduct.id,
                sku: 'DEMO-001',
                price: 5000000, // 50,000.00 ARS
                translations: [{ languageCode: LanguageCode.es, name: 'Producto Demo' }],
                taxCategoryId: taxCategory.id,
                stockOnHand: 100,
                trackInventory: 'TRUE' as any
            }]);
        }
        console.log('Seed complete.');
    } else {
        console.log('Products found, skipping seed.');

        // Ensure tax rate exists regardless of product seed status
        let taxCategory = (await taxCategoryService.findAll(ctx)).items[0];
        if (taxCategory) {
            const taxRate = (await taxRateService.findAll(ctx)).items.find(tr => tr.name === 'IVA 21%');
            if (!taxRate) {
                await taxRateService.create(ctx, {
                    name: 'IVA 21%',
                    enabled: true,
                    value: 21,
                    categoryId: taxCategory.id,
                    zoneId: zone.id,
                });
                console.log('Created Tax Rate: IVA 21%');
            }
        }
    }

    await app.close();
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
