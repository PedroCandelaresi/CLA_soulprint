import { addNavMenuItem, addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'home-carousel-section',
            label: 'Home',
            items: [],
            requiresPermission: 'ReadCatalog',
        },
        'marketing',
    ),
    addNavMenuItem(
        {
            id: 'home-carousel-slides',
            label: 'Carrusel · Slides',
            routerLink: ['/extensions/home-carousel'],
            icon: 'image',
            requiresPermission: 'ReadCatalog',
        },
        'home-carousel-section',
    ),
    addNavMenuItem(
        {
            id: 'home-carousel-settings',
            label: 'Carrusel · Ajustes',
            routerLink: ['/extensions/home-carousel/settings'],
            icon: 'cog',
            requiresPermission: 'ReadCatalog',
        },
        'home-carousel-section',
    ),
];
