/**
 * Standalone HTTP Server for Getnet Payment Routes
 * 
 * This runs as a separate process from Vendure, listening on its own port.
 * nginx proxies /payments/getnet/* to this server.
 * 
 * Usage:
 *   ts-node src/plugins/payments/getnet/server.ts
 * 
 * Environment variables:
 *   GETNET_PORT - Port to listen on (default: 3002)
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD - Database config
 *   GETNET_* - Getnet configuration (same as Vendure plugin)
 */

import http from 'http';
import { GetnetService } from './getnet.service';
import { createGetnetHandlers } from './getnet.controller';
import { getGetnetConfigFromEnv } from './index';
import { GetnetPaymentTransaction } from './getnet-transaction.entity';
import { DataSource } from 'typeorm';

const LOG_PREFIX = '[getnet:server]';

// Parse JSON body from request
function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// Simple request/response wrapper to match Express-style handlers
function createReqRes(req: http.IncomingMessage, res: http.ServerResponse): any {
    return {
        body: null as any,
        params: {} as Record<string, string>,
        query: {} as Record<string, string>,
        
        // Parse body and params
        async init() {
            this.body = await parseBody(req);
            
            // Parse URL params
            const url = req.url || '/';
            const pathname = new URL(url, 'http://localhost').pathname;
            
            // Extract path segments
            const segments = pathname.split('/').filter(Boolean);
            
            // Match patterns like /order/:uuid or /payments/getnet/order/:uuid
            const patterns = [
                { regex: /^\/order\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/payments\/getnet\/order\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/transaction\/([^/]+)$/, param: 'id' },
                { regex: /^\/payments\/getnet\/transaction\/([^/]+)$/, param: 'id' },
            ];
            
            for (const pattern of patterns) {
                const match = pathname.match(pattern.regex);
                if (match) {
                    this.params[pattern.param] = match[1];
                    break;
                }
            }
        },
        
        // Response helpers
        status(code: number) {
            res.statusCode = code;
            return this;
        },
        json(data: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return this;
        }
    };
}

async function main() {
    console.log(`${LOG_PREFIX} Starting standalone Getnet server...`);
    
    const config = getGetnetConfigFromEnv();
    const PORT = parseInt(process.env.GETNET_PORT || '3002', 10);
    
    // Validate required config
    const requiredFields = ['authBaseUrl', 'checkoutBaseUrl', 'clientId', 'clientSecret'];
    for (const field of requiredFields) {
        if (!config[field as keyof typeof config]) {
            throw new Error(`${LOG_PREFIX} Missing required config: ${field}`);
        }
    }
    
    if (config.clientId === 'your_client_id' || config.clientSecret === 'your_client_secret') {
        console.warn(`${LOG_PREFIX} WARNING: Using placeholder credentials!`);
    }
    
    // Initialize database connection
    console.log(`${LOG_PREFIX} Connecting to database...`);
    const dataSource = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_NAME || 'vendure',
        username: process.env.DB_USER || 'vendure',
        password: process.env.DB_PASSWORD || 'vendure',
        entities: [GetnetPaymentTransaction],
        synchronize: false, // Use migrations in production
        logging: process.env.NODE_ENV !== 'production',
    });
    
    await dataSource.initialize();
    console.log(`${LOG_PREFIX} Database connected`);
    
    // Initialize Getnet service
    console.log(`${LOG_PREFIX} Initializing Getnet service...`);
    const getnetService = new GetnetService(config, dataSource);
    
    // Create handlers
    const handlers = createGetnetHandlers(getnetService);
    
    // Create HTTP server
    const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        
        console.log(`${LOG_PREFIX} ${method} ${url}`);
        
        // Parse request
        const reqWrapper = createReqRes(req, res);
        await reqWrapper.init();
        
        // Route matching
        try {
            // Health check - multiple paths
            if (method === 'GET' && (url === '/health' || url === '/payments/getnet/health')) {
                await handlers.healthCheck(reqWrapper, res as any, () => {});
                return;
            }
            
            // Checkout - multiple paths
            if (method === 'POST' && (url === '/checkout' || url === '/payments/getnet/checkout')) {
                await handlers.createCheckout(reqWrapper, res as any, () => {});
                return;
            }
            
            // Order status
            if (method === 'GET' && (url.match(/^\/order\/[^/]+$/) || url.match(/^\/payments\/getnet\/order\/[^/]+$/))) {
                await handlers.getOrderStatus(reqWrapper, res as any, () => {});
                return;
            }
            
            // Transaction by ID
            if (method === 'GET' && (url.match(/^\/transaction\/[^/]+$/) || url.match(/^\/payments\/getnet\/transaction\/[^/]+$/))) {
                await handlers.getTransaction(reqWrapper, res as any, () => {});
                return;
            }
            
            // Webhook
            if (method === 'POST' && (url === '/webhook' || url === '/payments/getnet/webhook')) {
                await handlers.handleWebhook(reqWrapper, res as any, () => {});
                return;
            }
            
            // Not found
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Handler error:`, error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
    
    // Start server
    server.listen(PORT, () => {
        console.log(`${LOG_PREFIX} Server started!`);
        console.log(`${LOG_PREFIX} Listening on port ${PORT}`);
        console.log(`${LOG_PREFIX} Routes:`);
        console.log(`${LOG_PREFIX}   GET  /payments/getnet/health`);
        console.log(`${LOG_PREFIX}   POST /payments/getnet/checkout`);
        console.log(`${LOG_PREFIX}   GET  /payments/getnet/order/:uuid`);
        console.log(`${LOG_PREFIX}   GET  /payments/getnet/transaction/:id`);
        console.log(`${LOG_PREFIX}   POST /payments/getnet/webhook`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log(`${LOG_PREFIX} Shutting down...`);
        server.close();
        await dataSource.destroy();
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        console.log(`${LOG_PREFIX} Shutting down...`);
        server.close();
        await dataSource.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    console.error(`${LOG_PREFIX} Fatal error:`, error);
    process.exit(1);
});
