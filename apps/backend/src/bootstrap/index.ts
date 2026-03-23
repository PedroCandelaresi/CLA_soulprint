import { bootstrap, RequestContextService, SearchService } from '@vendure/core';
import { config } from '../config/vendure-config';

// Populate on start if needed or use separate script.
// For this setup we will assume populate is run separately or via seed.
// But we might want to ensure database access.

bootstrap(config)
    .then(async (app) => {
        // Reindex search to ensure colecciones/filtros reflejan cambios recientes
        try {
            const requestContextService = app.get(RequestContextService);
            const searchService = app.get(SearchService);
            const ctx = await requestContextService.create({ apiType: 'admin' });
            await searchService.reindex(ctx);
            console.log('Search index rebuilt');
        } catch (err) {
            console.warn('Search reindex failed (continuing):', err);
        }

        console.log('Vendure server started!');
        console.log('Shop API: http://localhost:3001/shop-api');
        console.log('Admin API: http://localhost:3001/admin-api');
        console.log('Admin UI: http://localhost:3001/admin');
    })
    .catch((err) => {
        console.error('Error starting Vendure server:', err);
        process.exit(1);
    });
