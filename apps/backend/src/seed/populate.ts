import { bootstrap, LanguageCode } from '@vendure/core';
import { ProductService, ProductVariantService, TaxCategoryService, RequestContextService, ZoneService, TaxRateService } from '@vendure/core';
import { config } from '../config/vendure-config';
import { ensureArgentinaDefaults } from '../bootstrap/argentina-defaults';

async function seed() {
    const app = await bootstrap(config);

    // Services
    const productVariantService = app.get(ProductVariantService);
    const productService = app.get(ProductService);
    const taxCategoryService = app.get(TaxCategoryService);
    const requestContextService = app.get(RequestContextService);

    console.log('Creating request context...');
    const ctx = await requestContextService.create({
        apiType: 'admin',
    });

    await ensureArgentinaDefaults(app);
    console.log('Channel updated to Argentina defaults');

    // Check if product exists
    const products = await productService.findAll(ctx, {});

    // Ensure Zone and Tax Rate
    const zoneService = app.get(ZoneService);
    const taxRateService = app.get(TaxRateService);
    const zone = (await zoneService.findAll(ctx)).items.find(z => z.name === 'Argentina');

    if (!zone) {
        throw new Error('Argentina zone was not created during bootstrap defaults.');
    }

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
            translations: [{ languageCode: LanguageCode.es, name: 'Demo Product', slug: 'demo-product', description: 'A great demo product' }],
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
