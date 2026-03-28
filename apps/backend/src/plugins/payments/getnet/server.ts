/**
 * Standalone HTTP Server for Getnet Payment Routes
 * 
 * This runs as a separate process from Vendure, listening on its own port.
 * nginx proxies /payments/getnet/* to this server.
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

// Create Express-style request/response wrapper
function createHandlerContext(req: http.IncomingMessage, res: http.ServerResponse) {
    let parsedBody: any = null;
    let params: Record<string, string> = {};
    let query: Record<string, string> = {};
    
    return {
        get body() { return parsedBody; },
        get params() { return params; },
        get query() { return query; },
        
        async parse() {
            parsedBody = await parseBody(req);
            const url = req.url || '/';
            const parsedUrl = new URL(url, 'http://localhost');
            const pathname = parsedUrl.pathname;
            query = Object.fromEntries(parsedUrl.searchParams.entries());
            
            // Match patterns
            const patterns = [
                { regex: /^\/order\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/payments\/getnet\/order\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/mock\/checkout\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/payments\/getnet\/mock\/checkout\/([^/]+)$/, param: 'uuid' },
                { regex: /^\/transaction\/([^/]+)$/, param: 'id' },
                { regex: /^\/payments\/getnet\/transaction\/([^/]+)$/, param: 'id' },
            ];
            
            for (const pattern of patterns) {
                const match = pathname.match(pattern.regex);
                if (match) {
                    params[pattern.param] = match[1];
                    break;
                }
            }
        },
        
        json(data: any) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        },
        
        status(code: number) {
            res.statusCode = code;
            return this;
        },

        setHeader(name: string, value: string) {
            res.setHeader(name, value);
            return this;
        },

        redirect(statusOrUrl: number | string, maybeUrl?: string) {
            const statusCode = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
            const location = typeof statusOrUrl === 'string' ? statusOrUrl : maybeUrl;
            res.statusCode = statusCode;
            if (location) {
                res.setHeader('Location', location);
            }
            res.end();
        },

        end(data?: any) {
            res.end(data);
        },
        
        send(data: any) {
            const contentType = typeof data === 'string'
                ? 'text/html; charset=utf-8'
                : 'application/json';

            if (!res.headersSent) {
                res.writeHead(res.statusCode || 200, { 'Content-Type': contentType });
            }
            res.end(typeof data === 'string' ? data : JSON.stringify(data));
        }
    };
}

async function main() {
    console.log(`${LOG_PREFIX} Starting standalone Getnet server...`);
    
    const config = getGetnetConfigFromEnv();
    const isMockMode = config.mode === 'mock';
    console.log(`${LOG_PREFIX} GETNET_MODE raw: ${process.env.GETNET_MODE || '(unset)'}`);
    console.log(`${LOG_PREFIX} Effective mode: ${config.mode}`);
    // Check multiple environment variable names for the port
    const PORT = parseInt(
        process.env.GETNET_STANDALONE_PORT ||
        process.env.GETNET_PORT ||
        process.env.PORT ||
        '4003',
        10
    );
    
    // Validate required config
    if (!isMockMode) {
        const requiredFields = ['authBaseUrl', 'checkoutBaseUrl', 'clientId', 'clientSecret'];
        for (const field of requiredFields) {
            if (!config[field as keyof typeof config]) {
                throw new Error(`${LOG_PREFIX} Missing required config: ${field}`);
            }
        }
    }
    
    if (!isMockMode && (config.clientId === 'your_client_id' || config.clientSecret === 'your_client_secret')) {
        console.warn(`${LOG_PREFIX} WARNING: Using placeholder credentials!`);
    }
    if (isMockMode) {
        console.warn(`${LOG_PREFIX} MOCK mode enabled (forceStatus=${config.mockForceStatus || 'interactive'})`);
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
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
    });
    
    await dataSource.initialize();
    console.log(`${LOG_PREFIX} Database connected`);
    
    // Initialize Getnet service
    console.log(`${LOG_PREFIX} Initializing Getnet service...`);
    const getnetService = new GetnetService(config, dataSource);
    console.log(`${LOG_PREFIX} Service initialized`);
    
    // Create handlers
    const handlers = createGetnetHandlers(getnetService);
    
    // Create HTTP server
    const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        const pathname = new URL(url, 'http://localhost').pathname;
        
        console.log(`${LOG_PREFIX} ${method} ${url}`);
        
        // Create context and parse request
        const ctx = createHandlerContext(req, res);
        await ctx.parse();
        
        try {
            // Health check
            if (method === 'GET' && (pathname === '/health' || pathname === '/payments/getnet/health')) {
                ctx.json({
                    success: true,
                    message: 'Getnet payment service is healthy',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            
            // Checkout
            if (method === 'POST' && (pathname === '/checkout' || pathname === '/payments/getnet/checkout')) {
                await handlers.createCheckout(ctx, null as any, () => {});
                return;
            }
            
            // Order status
            if (method === 'GET' && (pathname.match(/^\/order\/[^/]+$/) || pathname.match(/^\/payments\/getnet\/order\/[^/]+$/))) {
                await handlers.getOrderStatus(ctx, null as any, () => {});
                return;
            }

            if (
                method === 'GET'
                && (pathname.match(/^\/mock\/checkout\/[^/]+$/) || pathname.match(/^\/payments\/getnet\/mock\/checkout\/[^/]+$/))
            ) {
                await handlers.renderMockCheckout(ctx, null as any, () => {});
                return;
            }
            
            // Transaction by ID
            if (method === 'GET' && (pathname.match(/^\/transaction\/[^/]+$/) || pathname.match(/^\/payments\/getnet\/transaction\/[^/]+$/))) {
                await handlers.getTransaction(ctx, null as any, () => {});
                return;
            }
            
            // Webhook
            if (method === 'POST' && (pathname === '/webhook' || pathname === '/payments/getnet/webhook')) {
                await handlers.handleWebhook(ctx, null as any, () => {});
                return;
            }
            
            // Not found
            ctx.status(404).json({ error: 'Not found' });
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Handler error:`, error);
            ctx.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`${LOG_PREFIX} Server started!`);
        console.log(`${LOG_PREFIX} Listening on port ${PORT}`);
        console.log(`${LOG_PREFIX} Environment variables checked:`);
        console.log(`${LOG_PREFIX}   GETNET_STANDALONE_PORT: ${process.env.GETNET_STANDALONE_PORT || '(not set)'}`);
        console.log(`${LOG_PREFIX}   GETNET_PORT: ${process.env.GETNET_PORT || '(not set)'}`);
        console.log(`${LOG_PREFIX}   GETNET_MODE: ${process.env.GETNET_MODE || '(unset)'}`);
        console.log(`${LOG_PREFIX}   PORT: ${process.env.PORT || '(not set)'}`);
        console.log(`${LOG_PREFIX} Routes:`);
        console.log(`${LOG_PREFIX}   GET  /payments/getnet/health`);
        console.log(`${LOG_PREFIX}   POST /payments/getnet/checkout`);
        console.log(`${LOG_PREFIX}   GET  /payments/getnet/mock/checkout/:uuid`);
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
