import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuItem(
        {
            id: 'badges',
            label: 'Etiquetas visuales',
            routerLink: ['/extensions/badges'],
            icon: 'tag',
            requiresPermission: 'ReadCatalog',
        },
        'catalog',
    ),
];
