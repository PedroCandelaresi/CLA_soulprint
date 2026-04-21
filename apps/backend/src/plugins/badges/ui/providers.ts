import { addNavMenuSection } from '@vendure/admin-ui/core';

export default [
    addNavMenuSection(
        {
            id: 'cla-visual',
            label: 'CLA Visual',
            icon: 'image',
            collapsible: true,
            requiresPermission: 'ReadCatalog',
            items: [
                {
                    id: 'home-carousel-slides',
                    label: 'Carrusel',
                    routerLink: ['/extensions/home-carousel'],
                    icon: 'image',
                    requiresPermission: 'ReadCatalog',
                },
                {
                    id: 'home-carousel-settings',
                    label: 'Ajustes del carrusel',
                    routerLink: ['/extensions/home-carousel/settings'],
                    icon: 'cog',
                    requiresPermission: 'ReadCatalog',
                },
                {
                    id: 'badges',
                    label: 'Badges',
                    routerLink: ['/extensions/badges'],
                    icon: 'tag',
                    requiresPermission: 'ReadCatalog',
                },
            ],
        },
        'catalog',
    ),
];
