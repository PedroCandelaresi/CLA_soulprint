import { GetnetService } from './getnet.service';
import { CreateCheckoutDto, GetnetWebhookPayload } from './getnet.types';

const LOG_PREFIX = '[getnet:controller]';

// Generic request/response types (no Express dependency)
interface Request {
    body: any;
    params: Record<string, string>;
}

interface Response {
    status(code: number): Response;
    json(data: any): void;
}

type NextFunction = () => void;

/**
 * Create Express-style request handlers for Getnet payment endpoints
 * These are used by the standalone server that uses native Node.js HTTP
 */
export function createGetnetHandlers(getnetService: GetnetService) {
    
    /**
     * POST /checkout
     * Create a new checkout session with Getnet
     */
    async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as CreateCheckoutDto;
            
            // Validate required fields
            if (!body.orderCode) {
                res.status(400).json({ error: 'Missing required field: orderCode' });
                return;
            }
            
            if (!body.items || body.items.length === 0) {
                res.status(400).json({ error: 'Missing required field: items (must have at least one item)' });
                return;
            }
            
            // Validate items structure
            for (const item of body.items) {
                if (!item.name) {
                    res.status(400).json({ error: 'Each item must have a name' });
                    return;
                }
                if (typeof item.quantity !== 'number' || item.quantity < 1) {
                    res.status(400).json({ error: 'Each item must have a valid quantity (number >= 1)' });
                    return;
                }
                if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
                    res.status(400).json({ error: 'Each item must have a valid unitPrice (number >= 0, in cents)' });
                    return;
                }
            }
            
            console.log(`${LOG_PREFIX} Creating checkout for order: ${body.orderCode}`);
            
            const result = await getnetService.createOrder(body);
            
            console.log(`${LOG_PREFIX} Checkout created: ${result.orderUuid}, Transaction: ${result.transactionId}`);
            
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`${LOG_PREFIX} Checkout creation failed: ${errorMessage}`);
            
            res.status(500).json({
                success: false,
                error: errorMessage,
            });
        }
    }
    
    /**
     * GET /order/:uuid
     * Get order status from Getnet (by Getnet order UUID)
     */
    async function getOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { uuid } = req.params;
            
            if (!uuid) {
                res.status(400).json({ error: 'Missing required path parameter: uuid' });
                return;
            }
            
            console.log(`${LOG_PREFIX} Getting order status: ${uuid}`);
            
            const result = await getnetService.getOrderStatus(uuid);
            
            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`${LOG_PREFIX} Get order status failed: ${errorMessage}`);
            
            // Return 404 for not found orders
            if (errorMessage.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: errorMessage,
                });
                return;
            }
            
            res.status(500).json({
                success: false,
                error: errorMessage,
            });
        }
    }
    
    /**
     * GET /transaction/:id
     * Get transaction by local ID
     */
    async function getTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                res.status(400).json({ error: 'Missing required path parameter: id' });
                return;
            }
            
            console.log(`${LOG_PREFIX} Getting transaction: ${id}`);
            
            const transaction = await getnetService.findTransactionById(id);
            
            if (!transaction) {
                res.status(404).json({
                    success: false,
                    error: 'Transaction not found',
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: transaction,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`${LOG_PREFIX} Get transaction failed: ${errorMessage}`);
            
            res.status(500).json({
                success: false,
                error: errorMessage,
            });
        }
    }
    
    /**
     * POST /webhook
     * Receive and process webhook notifications from Getnet
     */
    async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body as GetnetWebhookPayload;
            
            console.log(`${LOG_PREFIX} Webhook received`);
            console.debug(`${LOG_PREFIX} Webhook body: ${JSON.stringify(payload, null, 2)}`);
            
            const result = await getnetService.processWebhook(payload);
            
            // Always return 200 to acknowledge receipt (prevents retries)
            res.status(200).json({
                success: result.success,
                message: result.message,
                isIdempotent: result.isIdempotent,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`${LOG_PREFIX} Webhook handling failed: ${errorMessage}`);
            
            // Still return 200 to prevent Getnet from retrying
            res.status(200).json({
                success: false,
                error: errorMessage,
            });
        }
    }
    
    /**
     * GET /health
     * Health check endpoint
     */
    async function healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
        res.status(200).json({
            success: true,
            message: 'Getnet payment service is healthy',
            timestamp: new Date().toISOString(),
        });
    }
    
    return {
        createCheckout,
        getOrderStatus,
        getTransaction,
        handleWebhook,
        healthCheck,
    };
}
