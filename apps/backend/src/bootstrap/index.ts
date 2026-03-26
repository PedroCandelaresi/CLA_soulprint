import { bootstrap, RequestContextService, SearchService, OrderService, PaymentService, EventBus } from '@vendure/core';
import { config } from '../config/vendure-config';
import { ensureArgentinaDefaults } from './argentina-defaults';
import { initGetnetPlugin, getGetnetMiddleware, getGetnetConfigFromEnv, getGetnetService } from '../plugins/payments/getnet';

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
            authBaseUrl: getnetConfig.authBaseUrl,
            checkoutBaseUrl: getnetConfig.checkoutBaseUrl,
            clientId: getnetConfig.clientId === 'your_client_id' ? 'PLACEHOLDER' : 'SET',
            currency: getnetConfig.currency,
        });
        
        // Get the database connection from Vendure app
        // In Vendure 2, the DataSource is accessed via app.injector
        let dataSource: any = null;
        
        const appAny = app as any;
        
        // Try to get DataSource from injector (NestJS/Vendure pattern)
        if (appAny.injector) {
            try {
                // Try to get the DataSource directly from injector
                dataSource = appAny.injector.get('DataSource') || appAny.injector.get('dataSource');
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
 * Try to register middleware on the Express server
 * In Vendure 2, this can be challenging as the Express app is internal
 */
async function registerMiddleware(app: Awaited<ReturnType<typeof bootstrap>>): Promise<boolean> {
    console.log('[getnet] Attempting to register Express middleware...');
    
    try {
        const middleware = getGetnetMiddleware();
        const appAny = app as any;
        
        // Try various paths to find Express app
        const expressPaths = [
            { name: 'express', get: () => appAny.express },
            { name: 'app (if Express)', get: () => appAny.use ? appAny : null },
            { name: 'apiServer.express', get: () => appAny.apiServer?.express },
            { name: 'apiServer.app', get: () => appAny.apiServer?.app },
            { name: 'httpAdapter', get: () => appAny.httpAdapter },
            { name: 'httpAdapter.app', get: () => appAny.httpAdapter?.app },
        ];
        
        for (const path of expressPaths) {
            const expressApp = path.get();
            if (expressApp && typeof expressApp.use === 'function') {
                console.log(`[getnet] Found Express app via "${path.name}"`);
                expressApp.use('/payments/getnet', middleware);
                console.log('[getnet] SUCCESS: Routes registered at /payments/getnet/*');
                return true;
            }
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

bootstrap(config)
    .then(async (app) => {
        console.log('[getnet] Vendure bootstrap complete');
        
        try {
            await ensureArgentinaDefaults(app);
            console.log('Argentina defaults ensured (country AR + currency ARS)');
        } catch (err) {
            console.warn('Argentina defaults setup failed (continuing):', err);
        }

        // Reindex search
        try {
            const requestContextService = app.get(RequestContextService);
            const searchService = app.get(SearchService);
            const ctx = await requestContextService.create({ apiType: 'admin' });
            await searchService.reindex(ctx);
            console.log('Search index rebuilt');
        } catch (err) {
            console.warn('Search reindex failed (continuing):', err);
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
        } else {
            console.warn('[getnet] Plugin not enabled - endpoints unavailable');
        }

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
