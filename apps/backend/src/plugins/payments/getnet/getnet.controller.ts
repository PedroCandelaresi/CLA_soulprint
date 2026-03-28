import { GetnetService } from './getnet.service';
import { CreateCheckoutDto, GetnetWebhookPayload } from './getnet.types';

const LOG_PREFIX = '[getnet:controller]';

// Generic request/response types (no Express dependency)
interface Request {
    body: any;
    params: Record<string, string>;
    query?: Record<string, unknown>;
}

interface Response {
    status(code: number): Response;
    json(data: any): void;
    send?(data: any): void;
    setHeader?(name: string, value: string): void;
    end?(data?: any): void;
    redirect?(statusOrUrl: number | string, url?: string): void;
}

type NextFunction = () => void;

function getQueryParam(req: Request, key: string): string | undefined {
    const value = req.query?.[key];
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0].trim();
    }
    return undefined;
}

function sendHtml(res: Response, html: string, statusCode = 200): void {
    const response = res as Response & {
        status?: (code: number) => Response;
        setHeader?: (name: string, value: string) => void;
        send?: (data: any) => void;
        end?: (data?: any) => void;
    };

    response.status?.(statusCode);
    response.setHeader?.('Content-Type', 'text/html; charset=utf-8');

    if (typeof response.send === 'function') {
        response.send(html);
        return;
    }
    if (typeof response.end === 'function') {
        response.end(html);
        return;
    }

    response.json({ html });
}

function redirect(res: Response, url: string): void {
    const response = res as Response & {
        status?: (code: number) => Response;
        setHeader?: (name: string, value: string) => void;
        end?: (data?: any) => void;
        redirect?: (statusOrUrl: number | string, url?: string) => void;
        json?: (data: any) => void;
    };

    if (typeof response.redirect === 'function') {
        response.redirect(302, url);
        return;
    }

    response.status?.(302);
    response.setHeader?.('Location', url);
    if (typeof response.end === 'function') {
        response.end();
        return;
    }

    response.json?.({ redirectUrl: url });
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildMockCheckoutHtml(input: {
    orderUuid: string;
    vendureOrderCode: string;
    transactionId: string;
    amount: number;
    currency: string;
}): string {
    const orderUuid = escapeHtml(input.orderUuid);
    const vendureOrderCode = escapeHtml(input.vendureOrderCode);
    const transactionId = escapeHtml(input.transactionId);
    const amount = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: input.currency === '032' ? 'ARS' : input.currency,
    }).format(input.amount / 100);
    const actions = [
        { status: 'approved', label: 'Aprobar pago', tone: '#17663a' },
        { status: 'rejected', label: 'Rechazar pago', tone: '#b42318' },
        { status: 'pending', label: 'Dejar pendiente', tone: '#8b5e00' },
        { status: 'cancelled', label: 'Cancelar pago', tone: '#344054' },
    ];

    const buttons = actions.map(action => `
        <a class="button" style="--button-color:${action.tone}" href="?status=${action.status}">
            ${action.label}
        </a>
    `).join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Getnet Mock Checkout</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: min(560px, 100%); background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
    .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475467; }
    h1 { margin: 12px 0 8px; font-size: 28px; }
    p { margin: 0 0 24px; color: #475467; line-height: 1.5; }
    .meta { display: grid; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 16px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .label { color: #475467; }
    .value { font-weight: 700; text-align: right; }
    .actions { display: grid; gap: 12px; }
    .button { display: block; text-decoration: none; text-align: center; padding: 14px 16px; border-radius: 14px; color: white; background: var(--button-color); font-weight: 700; }
    .note { margin-top: 20px; font-size: 13px; color: #667085; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="eyebrow">Getnet Mock</div>
      <h1>Simulación de checkout</h1>
      <p>Elegí el resultado del pago para seguir probando el flujo completo sin depender del proveedor real.</p>
      <div class="meta">
        <div class="row"><span class="label">Order UUID</span><span class="value">${orderUuid}</span></div>
        <div class="row"><span class="label">Orden Vendure</span><span class="value">${vendureOrderCode}</span></div>
        <div class="row"><span class="label">Transaction ID</span><span class="value">${transactionId}</span></div>
        <div class="row"><span class="label">Monto</span><span class="value">${amount}</span></div>
      </div>
      <div class="actions">${buttons}</div>
      <div class="note">Los botones disparan la misma actualización interna que usa el flujo de webhook para dejar el pedido pagado, rechazado o pendiente.</div>
    </div>
  </div>
</body>
</html>`;
}

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
                data: {
                    transactionId: transaction.id,
                    orderUuid: transaction.providerOrderUuid,
                    vendureOrderCode: transaction.vendureOrderCode,
                    status: transaction.status,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    createdAt: transaction.createdAt?.toISOString(),
                    updatedAt: transaction.updatedAt?.toISOString(),
                    expiresAt: transaction.expiresAt?.toISOString(),
                    approvedAt: transaction.approvedAt?.toISOString(),
                    lastEvent: transaction.lastEvent,
                    isTerminal: transaction.isTerminal,
                    webhookEventCount: transaction.webhookEventCount,
                },
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
     * GET /mock/checkout/:uuid
     * Render or finalize the mock checkout flow
     */
    async function renderMockCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!getnetService.isMockModeEnabled()) {
                res.status(404).json({
                    success: false,
                    error: 'Mock checkout is disabled',
                });
                return;
            }

            const { uuid } = req.params;
            if (!uuid) {
                res.status(400).json({ error: 'Missing required path parameter: uuid' });
                return;
            }

            const selectedStatus = getQueryParam(req, 'status');
            if (selectedStatus) {
                const result = await getnetService.completeMockCheckout(uuid, selectedStatus);
                redirect(res, result.redirectUrl);
                return;
            }

            const { transaction } = await getnetService.getMockCheckoutContext(uuid);
            sendHtml(res, buildMockCheckoutHtml({
                orderUuid: transaction.providerOrderUuid,
                vendureOrderCode: transaction.vendureOrderCode,
                transactionId: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`${LOG_PREFIX} Mock checkout failed: ${errorMessage}`);

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
        renderMockCheckout,
        handleWebhook,
        healthCheck,
    };
}
