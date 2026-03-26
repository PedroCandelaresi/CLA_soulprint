import { bootstrap, RequestContextService, SearchService, OrderService, PaymentService, EventBus } from '@vendure/core';
import { config } from '../config/vendure-config';
import { ensureArgentinaDefaults } from './argentina-defaults';
import { initGetnetPlugin, getGetnetMiddleware, getGetnetConfigFromEnv, getGetnetService } from '../plugins/payments/getnet';

// Populate on start if needed or use separate script.
// For this setup we will assume populate is run separately or via seed.
// But we might want to ensure database access.

/**
 * Initialize Getnet payment plugin if enabled
 * Only initialize in development environment or when explicitly configured
 */
async function initializeGetnet(app: Awaited<ReturnType<typeof bootstrap>>): Promise<boolean> {
    const getnetEnabled = process.env.GETNET_ENABLED === 'true';
    
    if (!getnetEnabled) {
        console.log('Getnet plugin is disabled (set GETNET_ENABLED=true to enable)');
        return false;
    }
    
    try {
        const getnetConfig = getGetnetConfigFromEnv();
        
        // Get the database connection from the Vendure app
        // Vendure stores the DataSource in the app
        const dataSource = (app as unknown as { dbConnection: import('typeorm').DataSource }).dbConnection;
        
        if (!dataSource) {
            console.error('Could not get DataSource from Vendure app');
            return false;
        }
        
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
            
            console.log('Getnet payment plugin initialized with Vendure services');
        } else {
            console.warn('Getnet service not available after initialization');
        }
        
        return true;
    } catch (error) {
        console.error('Failed to initialize Getnet plugin:', error);
        return false;
    }
}

bootstrap(config)
    .then(async (app) => {
        try {
            await ensureArgentinaDefaults(app);
            console.log('Argentina defaults ensured (country AR + currency ARS)');
        } catch (err) {
            console.warn('Argentina defaults setup failed (continuing):', err);
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

        // Initialize Getnet payment plugin
        const getnetInitialized = await initializeGetnet(app);
        
        // Add Getnet middleware if initialized
        if (getnetInitialized) {
            try {
                // Access the underlying Express app and add middleware
                // The Vendure bootstrap returns an app that can access the HTTP server
                const httpServer = (app as unknown as { appServer?: { express: { use: (path: string, middleware: unknown) => void } } }).appServer;
                
                if (httpServer?.express) {
                    httpServer.express.use('/payments/getnet', getGetnetMiddleware());
                    console.log('Getnet payment routes registered at /payments/getnet/*');
                } else {
                    // Alternative: try to access via app.httpServer
                    const httpServerAlt = (app as unknown as { httpServer?: { app?: { use: (path: string, middleware: unknown) => void } } }).httpServer;
                    if (httpServerAlt?.app) {
                        httpServerAlt.app.use('/payments/getnet', getGetnetMiddleware());
                        console.log('Getnet payment routes registered at /payments/getnet/*');
                    } else {
                        console.warn('Could not access Express server to register Getnet middleware');
                    }
                }
            } catch (err) {
                console.warn('Failed to register Getnet middleware (continuing without it):', err);
            }
        }

        console.log('Vendure server started!');
        console.log('Shop API: http://localhost:3001/shop-api');
        console.log('Admin API: http://localhost:3001/admin-api');
        console.log('Admin UI: http://localhost:3001/admin');
        
        if (getnetInitialized) {
            console.log('Getnet API: http://localhost:3001/payments/getnet/health');
        }
    })
    .catch((err) => {
        console.error('Error starting Vendure server:', err);
        process.exit(1);
    });
