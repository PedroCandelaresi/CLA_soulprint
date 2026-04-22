import { LanguageCode, ShippingCalculator, ShippingEligibilityChecker } from '@vendure/core';

const TAX_SETTING_AUTO = 'auto';
const TAX_SETTING_INCLUDE = 'include';
const TAX_SETTING_EXCLUDE = 'exclude';

function localized(value: string) {
    return [{ languageCode: LanguageCode.es, value }];
}

function normalize(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function asList(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(normalize).filter(Boolean);
}

function amount(value: unknown): number {
    return Math.max(0, Number(value || 0));
}

function getPriceIncludesTax(ctx: { channel: { pricesIncludeTax: boolean } }, setting: string): boolean {
    if (setting === TAX_SETTING_INCLUDE) {
        return true;
    }
    if (setting === TAX_SETTING_EXCLUDE) {
        return false;
    }
    return ctx.channel.pricesIncludeTax;
}

export const manualShippingEligibilityChecker = new ShippingEligibilityChecker({
    code: 'manual-shipping-eligibility-checker',
    description: localized('Envío manual: reglas de disponibilidad por compra, provincia y código postal'),
    args: {
        orderMinimum: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: localized('Compra mínima'),
            description: localized('El método aparece sólo si el subtotal con impuestos alcanza este importe. Usá 0 para no limitar.'),
        },
        orderMaximum: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: localized('Compra máxima'),
            description: localized('El método aparece sólo hasta este subtotal con impuestos. Usá 0 para no limitar.'),
        },
        allowedProvinces: {
            type: 'string',
            list: true,
            label: localized('Provincias habilitadas'),
            description: localized('Opcional. Si cargás valores, el método sólo aparece para esas provincias. Ej: Neuquén, Río Negro.'),
        },
        excludedProvinces: {
            type: 'string',
            list: true,
            label: localized('Provincias excluidas'),
            description: localized('Opcional. Provincias para las que este método no debe aparecer.'),
        },
        postalCodePrefixes: {
            type: 'string',
            list: true,
            label: localized('Prefijos de código postal'),
            description: localized('Opcional. Ej: 830, 831. Si queda vacío, no filtra por código postal.'),
        },
        requireShippingAddress: {
            type: 'boolean',
            defaultValue: true,
            label: localized('Requiere dirección de envío'),
            description: localized('Si está activo, el método no aparece hasta que el cliente cargue una dirección.'),
        },
    },
    check: (ctx, order, args) => {
        const subtotal = amount(order.subTotalWithTax);
        const orderMinimum = amount(args.orderMinimum);
        const orderMaximum = amount(args.orderMaximum);

        if (orderMinimum > 0 && subtotal < orderMinimum) {
            return false;
        }
        if (orderMaximum > 0 && subtotal > orderMaximum) {
            return false;
        }

        const address = order.shippingAddress;
        if (args.requireShippingAddress && !address) {
            return false;
        }

        const province = normalize(address?.province);
        const postalCode = normalize(address?.postalCode);
        const allowedProvinces = asList(args.allowedProvinces);
        const excludedProvinces = asList(args.excludedProvinces);
        const postalCodePrefixes = asList(args.postalCodePrefixes);

        if (allowedProvinces.length > 0 && !allowedProvinces.some(value => province === value || province.includes(value))) {
            return false;
        }
        if (excludedProvinces.length > 0 && excludedProvinces.some(value => province === value || province.includes(value))) {
            return false;
        }
        if (postalCodePrefixes.length > 0 && !postalCodePrefixes.some(prefix => postalCode.startsWith(prefix))) {
            return false;
        }

        return true;
    },
});

export const manualShippingCalculator = new ShippingCalculator({
    code: 'manual-shipping-calculator',
    description: localized('Envío manual: tarifa base configurable con extra por unidad y envío bonificado'),
    args: {
        baseRate: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: localized('Tarifa base'),
            description: localized('Importe principal del envío. Se expresa en la moneda del canal.'),
        },
        extraPerAdditionalItem: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: localized('Extra por unidad adicional'),
            description: localized('Recargo por cada unidad extra después de la primera. Usá 0 para no aplicar recargo.'),
        },
        freeAbove: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: localized('Gratis desde'),
            description: localized('Si el subtotal con impuestos alcanza este importe, el envío queda en 0. Usá 0 para desactivar.'),
        },
        includesTax: {
            type: 'string',
            defaultValue: TAX_SETTING_AUTO,
            ui: {
                component: 'select-form-input',
                options: [
                    { label: localized('Incluye IVA'), value: TAX_SETTING_INCLUDE },
                    { label: localized('No incluye IVA'), value: TAX_SETTING_EXCLUDE },
                    { label: localized('Automático según canal'), value: TAX_SETTING_AUTO },
                ],
            },
            label: localized('La tarifa incluye IVA'),
        },
        taxRate: {
            type: 'int',
            defaultValue: 21,
            ui: { component: 'number-form-input', suffix: '%' },
            label: localized('IVA del envío'),
        },
        estimatedMinDays: {
            type: 'int',
            defaultValue: 0,
            label: localized('Días mínimos estimados'),
            description: localized('Dato informativo para el storefront o integraciones. Usá 0 si no aplica.'),
        },
        estimatedMaxDays: {
            type: 'int',
            defaultValue: 0,
            label: localized('Días máximos estimados'),
            description: localized('Dato informativo para el storefront o integraciones. Usá 0 si no aplica.'),
        },
        serviceLabel: {
            type: 'string',
            defaultValue: '',
            label: localized('Etiqueta interna'),
            description: localized('Texto opcional para identificar el servicio calculado.'),
        },
    },
    calculate: (ctx, order, args) => {
        const quantity = order.lines.reduce((total, line) => total + line.quantity, 0);
        const additionalItems = Math.max(0, quantity - 1);
        const freeAbove = amount(args.freeAbove);
        const qualifiesForFreeShipping = freeAbove > 0 && amount(order.subTotalWithTax) >= freeAbove;
        const price = qualifiesForFreeShipping
            ? 0
            : amount(args.baseRate) + amount(args.extraPerAdditionalItem) * additionalItems;

        return {
            price,
            taxRate: amount(args.taxRate),
            priceIncludesTax: getPriceIncludesTax(ctx, args.includesTax),
            metadata: {
                serviceLabel: args.serviceLabel || null,
                estimatedMinDays: amount(args.estimatedMinDays),
                estimatedMaxDays: amount(args.estimatedMaxDays),
                freeShippingApplied: qualifiesForFreeShipping,
            },
        };
    },
});
