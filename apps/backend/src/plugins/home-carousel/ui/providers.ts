import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuItem(
        {
            id: 'home-carousel',
            label: 'Carrusel',
            routerLink: ['/extensions/home-carousel'],
            icon: 'image',
            requiresPermission: 'ReadCatalog',
        },
        'marketing',
    ),
];
