import { bootstrap, RequestContextService, SearchService, OrderService, PaymentService, EventBus, JobQueueService } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config } from '../config/vendure-config';
import { ensureArgentinaDefaults } from './argentina-defaults';
import {
    initGetnetPlugin,
    getGetnetMiddleware,
    getGetnetConfigFromEnv,
    getGetnetService,
} from '../plugins/payments/getnet';
import { initAndreani, getAndreaniOrderService, getAndreaniService, getAndreaniShipmentService } from '../plugins/logistics/andreani';
import { createAndreaniHandlers } from '../plugins/logistics/andreani/andreani.controller';
import { getAndreaniConfigFromEnv } from '../plugins/logistics/andreani/andreani.config';
import {
    PersonalizationService,
} from '../plugins/logistics/personalization';

/**
 * Initialize Getnet payment plugin
 * This plugin provides REST endpoints for Getnet Checkout (Santander) integration
 */
async function initializeGetnet(app: Awaited<ReturnType<typeof bootstrap>>): Promise<boolean> {
    // Read environment variables with detailed logging
    const getnetEnabledEnv = process.env.GETNET_ENABLED;
    const appEnv = process.env.APP_ENV || 'not set';
    const nodeEnv = process.env.NODE_ENV || 'not set';
    
    // Parse GETNET_ENABLED - handle various formats
    const getnetEnabledRaw = getnetEnabledEnv || '';
    const getnetEnabled = getnetEnabledRaw.toLowerCase().trim() === 'true';
    
    // Also enable in dev mode by default (APP_ENV=local or APP_ENV=dev)
    const isDevMode = appEnv === 'local' || appEnv === 'dev';
    const shouldEnable = getnetEnabled || isDevMode;
    
    console.log('[getnet] Environment check:');
    console.log(`  - GETNET_ENABLED="${getnetEnabledEnv}" (raw)`);
    console.log(`  - GETNET_ENABLED=${getnetEnabled} (parsed)`);
    console.log(`  - GETNET_MODE="${process.env.GETNET_MODE || '(unset)'}"`);
    console.log(`  - APP_ENV="${appEnv}"`);
    console.log(`  - NODE_ENV="${nodeEnv}"`);
    console.log(`  - isDevMode=${isDevMode}`);
    console.log(`  - shouldEnable=${shouldEnable}`);
    
    if (!shouldEnable) {
        console.log('[getnet] Plugin is disabled (GETNET_ENABLED!=true and not in dev mode)');
        return false;
    }
    
    console.log('[getnet] Plugin will be enabled');
    
    try {
        const getnetConfig = getGetnetConfigFromEnv();
        console.log('[getnet] Config loaded:', {
            mode: getnetConfig.mode,
            rawMode: process.env.GETNET_MODE || '(unset)',
            mockForceStatus: getnetConfig.mockForceStatus,
            authBaseUrl: getnetConfig.authBaseUrl,
            checkoutBaseUrl: getnetConfig.checkoutBaseUrl,
            clientId: getnetConfig.clientId === 'your_client_id' ? 'PLACEHOLDER' : 'SET',
            currency: getnetConfig.currency,
        });
        
        // Get the database connection from Vendure app
        // In Vendure 2, the DataSource is accessed via app.injector
        let dataSource: any = null;
        
        const appAny = app as any;

        try {
            dataSource = app.get(DataSource);
            if (dataSource) {
                console.log('[getnet] Found DataSource via app.get(DataSource)');
            }
        } catch (e) {
            // Not found via Nest app.get
        }
        
        // Try to get DataSource from injector (NestJS/Vendure pattern)
        if (!dataSource && appAny.injector) {
            try {
                // Try to get the DataSource directly from injector
                dataSource = appAny.injector.get(DataSource) || appAny.injector.get('DataSource') || appAny.injector.get('dataSource');
                if (dataSource) {
                    console.log('[getnet] Found DataSource via injector.get()');
                }
            } catch (e) {
                // Not found via injector
            }
        }
        
        // Try alternative paths
        if (!dataSource) {
            const dataSourcePaths = [
                { name: 'dbConnection', get: () => appAny.dbConnection },
                { name: 'dataSource', get: () => appAny.dataSource },
                { name: 'connection', get: () => appAny.connection },
            ];
            
            for (const path of dataSourcePaths) {
                dataSource = path.get();
                if (dataSource) {
                    console.log(`[getnet] Found DataSource via "${path.name}"`);
                    break;
                }
            }
        }
        
        if (!dataSource) {
            console.error('[getnet] Could not get DataSource from Vendure app');
            console.log('[getnet] Available app properties:', Object.keys(appAny).join(', '));
            console.log('[getnet] NOTE: Plugin initialization requires database access');
            console.log('[getnet] The standalone server handles Getnet API instead');
            return false;
        }
        
        console.log('[getnet] DataSource acquired successfully');
        
        // Initialize the plugin with DataSource
        initGetnetPlugin(getnetConfig, dataSource);
        
        // Get the Getnet service and register Vendure services for integration
        const getnetService = getGetnetService();
        if (getnetService) {
            // Get Vendure services from the DI container
            const orderService = app.get(OrderService);
            const paymentService = app.get(PaymentService);
            const requestContextService = app.get(RequestContextService);
            const eventBus = app.get(EventBus);
            
            // Register services for webhook processing
            getnetService.setVendureServices({
                orderService,
                paymentService,
                requestContextService,
                eventBus,
            });
            try {
                const personalizationService = app.get(PersonalizationService);
                personalizationService.setGetnetService(getnetService);
                getnetService.setPersonalizationService(personalizationService);
            } catch (error) {
                console.warn('[personalization] Personalization service unavailable for Getnet sync:', error);
            }
            
            console.log('[getnet] Payment plugin initialized with Vendure services');
        } else {
            console.warn('[getnet] Service not available after initialization');
        }
        
        return true;
    } catch (error) {
        console.error('[getnet] Failed to initialize plugin:', error);
        return false;
    }
}
/**
 * Helper that locates the Express handler embedded in Vendure/Nest.
 */
function getExpressApp(appAny: any): { app: any; source: string } | null {
    const isHttpRouter = (candidate: any): boolean =>
        Boolean(candidate)
        && typeof candidate.use === 'function'
        && typeof candidate.get === 'function'
        && typeof candidate.post === 'function';

    const expressPaths = [
        { name: 'httpAdapter.getInstance()', get: () => appAny.httpAdapter?.getInstance?.() },
        { name: 'express', get: () => appAny.express },
        { name: 'apiServer.express', get: () => appAny.apiServer?.express },
        { name: 'apiServer.app', get: () => appAny.apiServer?.app },
        { name: 'httpAdapter.app', get: () => appAny.httpAdapter?.app },
    ];

    for (const path of expressPaths) {
        const expressApp = path.get();
        if (isHttpRouter(expressApp)) {
            return { app: expressApp, source: path.name };
        }
    }

    return null;
}

function configureAuthTrustProxy(app: Awaited<ReturnType<typeof bootstrap>>): void {
    const cookieOptions = config.authOptions.cookieOptions;
    const shouldTrustProxy = cookieOptions?.secureProxy === true;

    if (!shouldTrustProxy) {
        console.log('[auth] Express trust proxy not enabled (COOKIE_SECURE_PROXY=false)');
        return;
    }

    const expressEntry = getExpressApp(app as any);
    if (!expressEntry) {
        console.warn('[auth] Could not find Express app to enable trust proxy for secure cookies.');
        return;
    }

    expressEntry.app.set('trust proxy', 1);
    console.log(`[auth] Enabled Express trust proxy via "${expressEntry.source}" for secure cookie sessions`);
}

function patchVendurePatchEntityForEmptyCustomFields(): void {
    const patchEntityModule = require('@vendure/core/dist/service/helpers/utils/patch-entity.js') as {
        patchEntity?: (entity: Record<string, unknown>, input: Record<string, unknown>) => Record<string, unknown>;
    };

    const originalPatchEntity = patchEntityModule.patchEntity;
    if (!originalPatchEntity || (originalPatchEntity as { __claPatched?: boolean }).__claPatched) {
        return;
    }

    const patchedPatchEntity = function patchEntitySafe(
        entity: Record<string, unknown> | null | undefined,
        input: Record<string, unknown>,
    ): Record<string, unknown> {
        const target = entity ?? {};
        const targetKeys = Object.keys(target);
        const keys = targetKeys.length > 0 ? targetKeys : Object.keys(input ?? {});

        for (const key of keys) {
            const value = input?.[key];
            if (key === 'customFields' && value && typeof value === 'object') {
                target[key] = patchEntitySafe(
                    target[key] as Record<string, unknown> | null | undefined,
                    value as Record<string, unknown>,
                );
            } else if (value !== undefined && key !== 'id') {
                target[key] = value;
            }
        }

        return target;
    };

    (patchedPatchEntity as { __claPatched?: boolean }).__claPatched = true;
    patchEntityModule.patchEntity = patchedPatchEntity;
    console.log('[auth] Patched Vendure patchEntity to handle empty customFields objects safely');
}

/**
 * Try to register middleware on the Express server
 * In Vendure 2, this can be challenging as the Express app is internal
 */
async function registerMiddleware(app: Awaited<ReturnType<typeof bootstrap>>): Promise<boolean> {
    console.log('[getnet] Attempting to register Express middleware...');

    try {
        const middleware = getGetnetMiddleware();
        const appAny = app as any;
        const expressEntry = getExpressApp(appAny);

        if (expressEntry) {
            console.log(`[getnet] Found Express app via "${expressEntry.source}"`);
            expressEntry.app.use('/payments/getnet', middleware);
            console.log('[getnet] SUCCESS: Routes registered at /payments/getnet/*');
            return true;
        }

        console.warn('[getnet] Could not find Express app to register middleware');
        console.log('[getnet] Available top-level properties:', Object.keys(appAny).join(', '));

        if (appAny.apiServer) {
            console.log('[getnet] apiServer properties:', Object.keys(appAny.apiServer).join(', '));
        }
    } catch (error) {
        console.error('[getnet] Error registering middleware:', error);
    }

    return false;
}

async function registerAndreaniRoutes(app: Awaited<ReturnType<typeof bootstrap>>): Promise<void> {
    const appAny = app as any;
    const expressEntry = getExpressApp(appAny);
    if (!expressEntry) {
        console.warn('[andreani] Could not find Express application to mount routes.');
        return;
    }

    let andreaniEnabled = false;
    try {
        andreaniEnabled = getAndreaniConfigFromEnv().enabled;
    } catch (error) {
        console.warn('[andreani] Could not read Andreani config while mounting routes. Falling back to disabled routes:', error);
    }

    const handlers = createAndreaniHandlers({
        enabled: andreaniEnabled,
        service: getAndreaniService(),
        selectionService: getAndreaniOrderService(),
    });
    expressEntry.app.post('/logistics/andreani/quote', async (req: any, res: any) => {
        await handlers.createQuote(req, res);
    });
    expressEntry.app.post('/logistics/andreani/selection', async (req: any, res: any) => {
        await handlers.persistSelection(req, res);
    });
    expressEntry.app.get('/logistics/andreani/order/:orderCode', async (req: any, res: any) => {
        await handlers.getOrderLogistics(req, res);
    });
    if (andreaniEnabled) {
        console.log('[andreani] Registered POST /logistics/andreani/quote via', expressEntry.source);
        console.log('[andreani] Registered POST /logistics/andreani/selection via', expressEntry.source);
        console.log('[andreani] Registered GET /logistics/andreani/order/:orderCode via', expressEntry.source);
    } else {
        console.log('[andreani] Registered disabled Andreani fallback routes via', expressEntry.source);
    }
}

bootstrap(config)
    .then(async (app) => {
        console.log('[getnet] Vendure bootstrap complete');
        patchVendurePatchEntityForEmptyCustomFields();
        configureAuthTrustProxy(app);
        const requestContextService = app.get(RequestContextService);
        const searchService = app.get(SearchService);
        const orderService = app.get(OrderService);
        const jobQueueService = app.get(JobQueueService);

        try {
            await jobQueueService.start();
            console.log('[job-queue] Started job queues in server process');
            for (const queue of jobQueueService.getJobQueues()) {
                console.log(`[job-queue]   ${queue.name}: running=${queue.running}`);
            }
        } catch (error) {
            console.error('[job-queue] Failed to start job queues in server process:', error);
        }

        try {
            await ensureArgentinaDefaults(app);
            console.log('Argentina defaults ensured (country AR + currency ARS)');
        } catch (err) {
            console.warn('Argentina defaults setup failed (continuing):', err);
        }

        // Reindex search
        try {
            const ctx = await requestContextService.create({ apiType: 'admin' });
            await searchService.reindex(ctx);
            console.log('Search index rebuilt');
        } catch (err) {
            console.warn('Search reindex failed (continuing):', err);
        }

        try {
            initAndreani(orderService, requestContextService);
        } catch (error) {
            console.error('[andreani] Initialization failed:', error);
        }

        // Initialize Getnet payment plugin
        const getnetInitialized = await initializeGetnet(app);
        
        // Add Getnet middleware if initialized
        if (getnetInitialized) {
            const middlewareRegistered = await registerMiddleware(app);
            
            if (!middlewareRegistered) {
                console.warn('[getnet] WARNING: REST endpoints not mounted via middleware');
                console.warn('[getnet] INFO: Use standalone server or frontend /api/payments/getnet routes');
            }
            const getnetService = getGetnetService();
            const shipmentService = getAndreaniShipmentService();
            if (getnetService && shipmentService) {
                getnetService.setAndreaniShipmentService(shipmentService);
            }
        } else {
            console.warn('[getnet] Plugin not enabled - endpoints unavailable');
        }

        await registerAndreaniRoutes(app);

        console.log('Vendure server started!');
        console.log('Shop API: http://localhost:3001/shop-api');
        console.log('Admin API: http://localhost:3001/admin-api');
        console.log('Admin UI: http://localhost:3001/admin');
        
        if (getnetInitialized) {
            console.log('Getnet REST: http://localhost:3001/payments/getnet/health (if middleware works)');
            console.log('[getnet] Alternatively use: http://localhost:3002/payments/getnet/health (standalone)');
        }
    })
    .catch((err) => {
        console.error('Error starting Vendure server:', err);
        process.exit(1);
    });
