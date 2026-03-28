/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource } from 'typeorm';
import { GetnetService } from './getnet.service';
import { createGetnetHandlers } from './getnet.controller';
import { GetnetPluginConfig } from './getnet.types';
import { GetnetPaymentTransaction } from './getnet-transaction.entity';

// Type for Express middleware (avoid importing express types)
type ExpressMiddleware = (
    req: { path: string; method: string; [key: string]: any },
    res: { [key: string]: any },
    next: () => void
) => void;

// Singleton instance
let getnetService: GetnetService | null = null;

function resolveGetnetModeFromEnv(): GetnetPluginConfig['mode'] {
    const rawMode = process.env.GETNET_MODE?.trim().toLowerCase();
    if (rawMode === 'mock' || rawMode === 'real') {
        return rawMode;
    }
    if (rawMode) {
        console.warn(`[getnet] Invalid GETNET_MODE="${process.env.GETNET_MODE}". Falling back to "real".`);
    }
    return 'real';
}

/**
 * Initialize the Getnet plugin configuration
 * Call this during Vendure bootstrap to set up the payment service
 */
export function initGetnetPlugin(config: GetnetPluginConfig, dataSource: DataSource): void {
    console.log('[getnet] Initializing Getnet plugin...');
    
    const isMockMode = config.mode === 'mock';

    // Validate required config
    if (!isMockMode) {
        const requiredFields = ['authBaseUrl', 'checkoutBaseUrl', 'clientId', 'clientSecret'];
        for (const field of requiredFields) {
            if (!config[field as keyof GetnetPluginConfig]) {
                throw new Error(`[getnet] Missing required config: ${field}`);
            }
        }
    }
    
    // Check if credentials are placeholder values
    if (!isMockMode && (config.clientId === 'your_client_id' || config.clientSecret === 'your_client_secret')) {
        console.warn('[getnet] WARNING: Using placeholder credentials. Set GETNET_CLIENT_ID and GETNET_CLIENT_SECRET in environment.');
    }
    if (isMockMode) {
        console.warn(`[getnet] MOCK mode enabled (forceStatus=${config.mockForceStatus || 'interactive'})`);
    }
    
    // Ensure the entity is registered with TypeORM
    // TypeORM will auto-create the table when synchronize=true (development mode)
    const entityMetadata = dataSource.entityMetadatas.find(
        (meta: any) => meta.name === 'GetnetPaymentTransaction'
    );
    
    if (!entityMetadata) {
        console.log('[getnet] Entity not found in DataSource, ensuring table creation on next sync...');
    } else {
        console.log('[getnet] Entity metadata found: ' + entityMetadata.tableName);
    }
    
    // Initialize the service with dataSource - the repository will use it
    getnetService = new GetnetService(config, dataSource);
    
    console.log('[getnet] Plugin initialized successfully');
}

/**
 * Get the GetnetService instance (for testing or external access)
 */
export function getGetnetService(): GetnetService | null {
    return getnetService;
}

/**
 * Create Express middleware to handle Getnet routes
 * Add this to your Express app or integrate with Vendure's middleware system
 */
export function getGetnetMiddleware(): ExpressMiddleware {
    if (!getnetService) {
        throw new Error('[getnet] Plugin not initialized. Call initGetnetPlugin() first.');
    }
    
    const handlers = createGetnetHandlers(getnetService);
    
    // Express router middleware
    return (req: any, res: any, next: any) => {
        const path = req.path;
        const method = req.method;
        
        // Strip the base path (/payments/getnet) before matching
        const relativePath = path.replace(/^\/payments\/getnet/, '') || '/';
        
        console.log(`[getnet:middleware] ${method} ${path} -> ${relativePath}`);
        
        // Health check
        if (method === 'GET' && (relativePath === '/' || relativePath === '/health')) {
            return handlers.healthCheck(req, res, next);
        }
        
        // Create checkout
        if (method === 'POST' && relativePath === '/checkout') {
            return handlers.createCheckout(req, res, next);
        }
        
        // Get order status
        if (method === 'GET' && relativePath.match(/^\/order\/[^/]+$/)) {
            return handlers.getOrderStatus(req, res, next);
        }

        if (method === 'GET' && relativePath.match(/^\/mock\/checkout\/[^/]+$/)) {
            return handlers.renderMockCheckout(req, res, next);
        }
        
        // Get transaction by local ID
        if (method === 'GET' && relativePath.match(/^\/transaction\/[^/]+$/)) {
            return handlers.getTransaction(req, res, next);
        }
        
        // Webhook handler
        if (method === 'POST' && relativePath === '/webhook') {
            return handlers.handleWebhook(req, res, next);
        }
        
        // Not handled by this middleware, continue to next
        next();
    };
}

/**
 * Get the default configuration from environment variables
 */
export function getGetnetConfigFromEnv(): GetnetPluginConfig {
    const mode = resolveGetnetModeFromEnv();
    return {
        mode,
        mockForceStatus: (process.env.GETNET_MOCK_FORCE_STATUS || 'interactive').toLowerCase() as GetnetPluginConfig['mockForceStatus'],
        authBaseUrl: process.env.GETNET_AUTH_BASE_URL || 'https://auth.preprod.geopagos.com',
        checkoutBaseUrl: process.env.GETNET_CHECKOUT_BASE_URL || 'https://api-santander.preprod.geopagos.com',
        clientId: process.env.GETNET_CLIENT_ID || 'your_client_id',
        clientSecret: process.env.GETNET_CLIENT_SECRET || 'your_client_secret',
        scope: process.env.GETNET_SCOPE || '*',
        currency: process.env.GETNET_CURRENCY || '032',
        webhookUrl: process.env.GETNET_WEBHOOK_URL || '',
        successUrl: process.env.GETNET_SUCCESS_URL || 'http://localhost:3000/checkout/success',
        failedUrl: process.env.GETNET_FAILED_URL || 'http://localhost:3000/checkout/failed',
        expireLimitMinutes: parseInt(process.env.GETNET_EXPIRE_LIMIT_MINUTES || '10', 10),
        requestTimeout: parseInt(process.env.GETNET_REQUEST_TIMEOUT || '30000', 10),
    };
}

// Export types for external use
export * from './getnet.types';
export * from './getnet-transaction.entity';
export { GetnetService } from './getnet.service';
export { getnetPaymentHandler } from './getnet-payment.handler';
