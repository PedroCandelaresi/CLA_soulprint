import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
    addNavMenuItem(
        {
            id: 'home-carousel-slides',
            label: 'Carrusel · Slides',
            routerLink: ['/extensions/home-carousel'],
            icon: 'image',
            requiresPermission: 'ReadCatalog',
        },
        'marketing',
    ),
    addNavMenuItem(
        {
            id: 'home-carousel-settings',
            label: 'Carrusel · Ajustes',
            routerLink: ['/extensions/home-carousel/settings'],
            icon: 'cog',
            requiresPermission: 'ReadCatalog',
        },
        'marketing',
    ),
];
