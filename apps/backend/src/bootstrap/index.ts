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
    // Check both environment variable and dev mode
    const getnetEnabled = process.env.GETNET_ENABLED === 'true';
    const appEnv = process.env.APP_ENV || 'local';
    const isDev = appEnv === 'local' || appEnv === 'dev';
    
    if (!getnetEnabled && !isDev) {
        console.log('[getnet] Plugin is disabled (set GETNET_ENABLED=true to enable)');
        return false;
    }
    
    console.log(`[getnet] Initializing plugin (enabled=${getnetEnabled}, dev=${isDev})...`);
    
    try {
        const getnetConfig = getGetnetConfigFromEnv();
        
        // Get the database connection from the Vendure app
        // Vendure stores the DataSource in the app
        const dataSource = (app as unknown as { dbConnection: import('typeorm').DataSource }).dbConnection;
        
        if (!dataSource) {
            console.error('[getnet] Could not get DataSource from Vendure app');
            return false;
        }
        
        console.log('[getnet] DataSource acquired');
        
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
 * Find and register middleware on the Express app
 * Vendure 2 exposes the HTTP server through apiServer.servers
 */
async function registerMiddleware(app: Awaited<ReturnType<typeof bootstrap>>): Promise<boolean> {
    const middleware = getGetnetMiddleware();
    
    console.log('[getnet] Searching for Express server...');
    
    // In Vendure 2, the server structure is typically:
    // app.apiServer.servers[0].server (or httpServer)
    
    try {
        // Check for apiServer
        const apiServer = (app as any)?.apiServer;
        if (apiServer) {
            console.log('[getnet] Found apiServer');
            
            // Try to access the underlying HTTP server
            // In Vendure 2 with @vendure/http-server-plugin or similar
            
            // Check servers array
            const servers = apiServer?.servers;
            if (servers && Array.isArray(servers)) {
                console.log(`[getnet] Found ${servers.length} server(s)`);
                
                for (let i = 0; i < servers.length; i++) {
                    const server = servers[i];
                    console.log(`[getnet] Checking server[${i}]:`, typeof server);
                    
                    // Check for httpServer property
                    const httpServer = server?.httpServer || server?.server;
                    if (httpServer && typeof httpServer.on === 'function') {
                        console.log(`[getnet] Found httpServer on server[${i}]`);
                        
                        // In Node.js http.Server, you can access the underlying app via .on('request', ...)
                        // But a better approach is to use the event emitter pattern
                        
                        // Try to get the express app from the server's request handler
                        // This is tricky because Node's http.Server doesn't expose the app directly
                        
                        // Alternative: check if there's an express property
                        const expressApp = server?.express || server?.app;
                        if (expressApp && typeof expressApp.use === 'function') {
                            expressApp.use('/payments/getnet', middleware);
                            console.log('[getnet] SUCCESS: Routes registered via server[${i}].express');
                            return true;
                        }
                    }
                }
            }
            
            // Try direct express property
            const expressApp = apiServer?.express || apiServer?.app;
            if (expressApp && typeof expressApp.use === 'function') {
                expressApp.use('/payments/getnet', middleware);
                console.log('[getnet] SUCCESS: Routes registered via apiServer.express');
                return true;
            }
        }
        
        // Try accessing httpServer directly
        const httpServer = (app as any)?.httpServer;
        if (httpServer && typeof httpServer.on === 'function') {
            console.log('[getnet] Found httpServer');
            
            // The httpServer in Vendure 2 wraps an express app
            // We can try to get the wrapped app through inspection
            // or by listening to 'request' events
        }
        
        // Last resort: try to use app directly if it's an express app
        if (app && typeof (app as any).use === 'function') {
            (app as any).use('/payments/getnet', middleware);
            console.log('[getnet] SUCCESS: Routes registered via app directly');
            return true;
        }
        
    } catch (error) {
        console.error('[getnet] Error during middleware registration:', error);
    }
    
    console.warn('[getnet] Could not find Express server to register middleware');
    console.log('[getnet] Available app keys:', Object.keys(app || {}).join(', '));
    
    // Log nested structure for debugging
    try {
        console.log('[getnet] apiServer keys:', Object.keys((app as any)?.apiServer || {}).join(', '));
        if ((app as any)?.apiServer?.servers) {
            console.log('[getnet] servers array length:', (app as any).apiServer.servers.length);
        }
    } catch (e) {
        // Ignore
    }
    
    return false;
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
            const middlewareRegistered = await registerMiddleware(app);
            
            if (!middlewareRegistered) {
                console.warn('[getnet] WARNING: Middleware not registered. REST endpoints will not be available.');
                console.warn('[getnet] The plugin is initialized but the REST API routes are not mounted.');
                console.warn('[getnet] Consider using the frontend /api/payments/getnet routes instead.');
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
