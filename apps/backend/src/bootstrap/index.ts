import { bootstrap, JobQueueService, RequestContextService, SearchService } from '@vendure/core';
import { config } from '../config/vendure-config';
import { ensureDemoData } from '../seed/ensure-demo-data';
import { ensureMercadoPagoPaymentMethod } from '../seed/ensure-mercadopago-payment';

const ENABLE_DEMO_BOOTSTRAP =
    process.env.BOOTSTRAP_DEMO_DATA !== 'false' && process.env.APP_ENV !== 'production';
const RUN_JOB_QUEUE_IN_MAIN_PROCESS = process.env.RUN_JOB_QUEUE_IN_MAIN_PROCESS === 'true';

// Populate on start if needed or use separate script.
// For this setup we will assume populate is run separately or via seed.
// But we might want to ensure database access.

bootstrap(config)
    .then(async (app) => {
        if (RUN_JOB_QUEUE_IN_MAIN_PROCESS) {
            try {
                await app.get(JobQueueService).start();
                console.log('Job queue started in main server process');
            } catch (err) {
                console.error('Job queue failed to start in main server process:', err);
                process.exit(1);
            }
        } else {
            console.warn(
                'Job queue is not running in the main server process. Transactional emails and other background jobs require a dedicated worker.',
            );
        }

        await ensureMercadoPagoPaymentMethod(app);

        if (ENABLE_DEMO_BOOTSTRAP) {
            try {
                const summary = await ensureDemoData(app);
                const created = summary.created.length ? summary.created.join(', ') : 'nothing';
                const existing = summary.existing.length ? summary.existing.join(', ') : 'nothing';
                console.log(`Demo bootstrap ensured. Created: ${created}. Existing: ${existing}.`);
            } catch (err) {
                console.warn('Demo bootstrap failed (continuing):', err);
            }
        }

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
