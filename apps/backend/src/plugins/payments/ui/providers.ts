import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuItem(
        {
            id: 'storefront-payment-settings',
            label: 'Pagos storefront',
            routerLink: ['/extensions/payment-display'],
            icon: 'credit-card',
            requiresPermission: 'ReadSettings',
        },
        'settings',
    ),
];
