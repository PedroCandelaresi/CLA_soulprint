import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Res,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MockPaymentService } from './mock-payment.service';

const LOG_PREFIX = '[mock-payment]';

function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildPaymentPageHtml(transactionCode: string, amount: number, currencyCode: string): string {
    const safeCode = escapeHtml(transactionCode);
    const formattedAmount = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
    }).format(amount / 100);
    const confirmUrl = `/payments/mock/confirm/${safeCode}`;

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock Payment — Simulación de pago</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f0f2f5;
      color: #1a1a2e;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(520px, 100%);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.10);
      overflow: hidden;
    }
    .card-header {
      background: #1a1a2e;
      color: #ffffff;
      padding: 24px 28px 20px;
    }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 100px;
      padding: 4px 10px;
      margin-bottom: 12px;
    }
    .card-header h1 {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    }
    .card-header p {
      margin-top: 6px;
      font-size: 14px;
      color: rgba(255,255,255,0.65);
    }
    .card-body { padding: 28px; }
    .amount-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 24px;
    }
    .amount-label { font-size: 13px; color: #6b7280; }
    .amount-value { font-size: 32px; font-weight: 800; color: #1a1a2e; }
    .meta {
      background: #f8f9fb;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
    }
    .meta-key { color: #6b7280; }
    .meta-val { font-weight: 600; word-break: break-all; text-align: right; }
    .actions { display: flex; flex-direction: column; gap: 12px; }
    .btn {
      display: block;
      width: 100%;
      padding: 15px 20px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      text-align: center;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.88; }
    .btn-approve { background: #16a34a; color: #fff; }
    .btn-reject  { background: #dc2626; color: #fff; }
    .note {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="badge">Mock Payment</div>
      <h1>Simulación de pago</h1>
      <p>Elegí el resultado para continuar con el flujo de la orden.</p>
    </div>
    <div class="card-body">
      <div class="amount-row">
        <span class="amount-label">Total a pagar</span>
        <span class="amount-value">${escapeHtml(formattedAmount)}</span>
      </div>
      <div class="meta">
        <div class="meta-row">
          <span class="meta-key">Código de transacción</span>
          <span class="meta-val">${safeCode}</span>
        </div>
        <div class="meta-row">
          <span class="meta-key">Moneda</span>
          <span class="meta-val">${escapeHtml(currencyCode)}</span>
        </div>
      </div>
      <div class="actions">
        <form method="POST" action="${escapeHtml(confirmUrl)}" style="margin:0">
          <input type="hidden" name="result" value="approved" />
          <button type="submit" class="btn btn-approve">Aprobar pago ✓</button>
        </form>
        <form method="POST" action="${escapeHtml(confirmUrl)}" style="margin:0">
          <input type="hidden" name="result" value="rejected" />
          <button type="submit" class="btn btn-reject">Rechazar pago ✗</button>
        </form>
      </div>
      <p class="note">
        Esta página es solo para desarrollo/testing.<br>
        No se procesará ningún pago real.
      </p>
    </div>
  </div>
</body>
</html>`;
}

@Controller('payments/mock')
export class MockPaymentController {
    constructor(private readonly mockPaymentService: MockPaymentService) {}

    /**
     * GET /payments/mock/health
     * Simple health check.
     */
    @Get('health')
    healthCheck(): { ok: boolean } {
        return { ok: true };
    }

    /**
     * POST /payments/mock/checkout
     * Body: { orderCode: string }
     * Initiates a mock checkout session for the given order.
     */
    @Post('checkout')
    @HttpCode(HttpStatus.CREATED)
    async createCheckout(@Body() body: { orderCode: string }): Promise<{
        success: boolean;
        data?: {
            transactionCode: string;
            checkoutUrl: string;
            amount: number;
            currencyCode: string;
        };
        error?: string;
    }> {
        console.log(`${LOG_PREFIX} POST /checkout — orderCode: ${body?.orderCode}`);

        if (!body?.orderCode) {
            return { success: false, error: 'Missing required field: orderCode' };
        }

        try {
            const result = await this.mockPaymentService.createCheckout(body.orderCode);
            console.log(
                `${LOG_PREFIX} Checkout created: transactionCode=${result.transactionCode}, amount=${result.amount}`,
            );
            return { success: true, data: result };
        } catch (error: any) {
            console.error(`${LOG_PREFIX} createCheckout error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * POST /payments/mock/confirm/:transactionCode
     * Body: { result: 'approved' | 'rejected' }
     * Confirms (or rejects) a pending payment transaction.
     */
    @Post('confirm/:transactionCode')
    @HttpCode(HttpStatus.OK)
    async confirmPayment(
        @Param('transactionCode') transactionCode: string,
        @Body() body: { result: 'approved' | 'rejected' },
    ): Promise<{
        success: boolean;
        status?: string;
        message?: string;
        error?: string;
    }> {
        console.log(
            `${LOG_PREFIX} POST /confirm/${transactionCode} — result: ${body?.result}`,
        );

        const result = body?.result;
        if (result !== 'approved' && result !== 'rejected') {
            return {
                success: false,
                error: 'Invalid value for "result". Must be "approved" or "rejected".',
            };
        }

        try {
            const outcome = await this.mockPaymentService.confirmPayment(transactionCode, result);
            console.log(
                `${LOG_PREFIX} confirmPayment done: transactionCode=${transactionCode}, status=${outcome.status}`,
            );
            return { success: outcome.success, status: outcome.status, message: outcome.message };
        } catch (error: any) {
            console.error(`${LOG_PREFIX} confirmPayment error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET /payments/mock/transaction/:transactionCode
     * Returns the stored MockPaymentTransaction or 404 if not found.
     */
    @Get('transaction/:transactionCode')
    async getTransaction(
        @Param('transactionCode') transactionCode: string,
    ): Promise<unknown> {
        console.log(`${LOG_PREFIX} GET /transaction/${transactionCode}`);

        const transaction = await this.mockPaymentService.getTransaction(transactionCode);
        if (!transaction) {
            throw new NotFoundException(`Transaction not found: ${transactionCode}`);
        }

        return {
            success: true,
            data: {
                id: transaction.id,
                orderCode: transaction.orderCode,
                transactionCode: transaction.transactionCode,
                status: transaction.status,
                expectedAmount: transaction.expectedAmount,
                currencyCode: transaction.currencyCode,
                settledAt: transaction.settledAt?.toISOString() ?? null,
                createdAt: transaction.createdAt?.toISOString(),
                updatedAt: transaction.updatedAt?.toISOString(),
            },
        };
    }

    /**
     * GET /payments/mock/pay/:transactionCode
     * Renders the mock payment UI with "Aprobar pago" and "Rechazar pago" buttons.
     * The buttons POST to /payments/mock/confirm/:transactionCode with the chosen result.
     */
    @Get('pay/:transactionCode')
    async renderPaymentPage(
        @Param('transactionCode') transactionCode: string,
        @Res() res: Response,
    ): Promise<void> {
        console.log(`${LOG_PREFIX} GET /pay/${transactionCode} — rendering payment page`);

        const transaction = await this.mockPaymentService.getTransaction(transactionCode);
        if (!transaction) {
            res.status(HttpStatus.NOT_FOUND).send('<h1>Transacción no encontrada</h1>');
            return;
        }

        const html = buildPaymentPageHtml(
            transaction.transactionCode,
            transaction.expectedAmount,
            transaction.currencyCode,
        );

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(HttpStatus.OK).send(html);
    }
}
