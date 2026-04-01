import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { OrderService, RequestContextService } from '@vendure/core';
import type { Response } from 'express';
import { MockLogisticsService, MockQuoteOption } from './mock-logistics.service';

// ---------------------------------------------------------------------------
// Request body shapes
// ---------------------------------------------------------------------------

interface QuoteBody {
    orderCode: string;
    postalCode: string;
    city: string;
    weightKg: number;
}

interface SelectBody {
    orderCode: string;
    quoteCode: string;
    postalCode: string;
    city: string;
    weightKg: number;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('logistics/mock')
export class MockLogisticsController {
    constructor(
        private readonly mockLogisticsService: MockLogisticsService,
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
    ) {}

    /** GET /logistics/mock/health */
    @Get('health')
    health(@Res() res: Response) {
        return res.status(200).json({ ok: true });
    }

    /**
     * POST /logistics/mock/quote
     * Body: { orderCode, postalCode, city, weightKg }
     */
    @Post('quote')
    @HttpCode(200)
    async createQuote(@Body() body: QuoteBody, @Res() res: Response) {
        const { postalCode, city, weightKg } = body;

        try {
            const results = this.mockLogisticsService.quote(postalCode, city, Number(weightKg));
            return res.status(200).json({ success: true, data: results });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Mock quote failed';
            console.error(`[mock-logistics] POST /quote error: ${message}`);
            return res.status(400).json({ success: false, error: message });
        }
    }

    /**
     * POST /logistics/mock/select
     * Body: { orderCode, quoteCode, postalCode, city, weightKg }
     * Persists the chosen shipping option to Order.customFields.
     */
    @Post('select')
    @HttpCode(200)
    async selectQuote(@Body() body: SelectBody, @Res() res: Response) {
        const { orderCode, quoteCode, postalCode, city, weightKg } = body;

        if (!orderCode || !quoteCode || !postalCode) {
            return res.status(400).json({
                success: false,
                error: 'orderCode, quoteCode, and postalCode are required',
            });
        }

        try {
            // Obtain the quote options to validate the chosen quoteCode and get its details.
            const results = this.mockLogisticsService.quote(postalCode, city, Number(weightKg));
            const allOptions: MockQuoteOption[] = results.flatMap(r => r.options);
            const chosen = allOptions.find(opt => opt.code === quoteCode);

            if (!chosen) {
                return res.status(400).json({
                    success: false,
                    error: `Unknown quoteCode "${quoteCode}". Valid options: ${allOptions.map(o => o.code).join(', ')}`,
                });
            }

            const snapshot = this.mockLogisticsService.buildSelectionSnapshot(
                orderCode,
                chosen,
                postalCode,
                city,
                Number(weightKg),
            );

            // Persist to Order.customFields via Vendure services
            const ctx = await this.requestContextService.create({ apiType: 'admin' });
            const order = await this.orderService.findOneByCode(ctx, orderCode);

            if (!order) {
                return res.status(404).json({ success: false, error: `Order "${orderCode}" not found` });
            }

            await this.orderService.updateCustomFields(ctx, order.id, {
                shippingQuoteCode: snapshot.quoteCode,
                shippingMethodLabel: snapshot.methodLabel,
                shippingPriceCents: snapshot.priceCents,
                shippingSnapshotJson: JSON.stringify(snapshot),
            });

            console.log(
                `[mock-logistics] POST /select — order=${orderCode} quoteCode=${quoteCode} price=${snapshot.priceCents}`,
            );

            return res.status(200).json({ success: true, data: snapshot });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Mock select failed';
            console.error(`[mock-logistics] POST /select error: ${message}`);
            return res.status(400).json({ success: false, error: message });
        }
    }

    /**
     * GET /logistics/mock/order/:orderCode
     * Returns the current shipping selection stored in order.customFields.
     */
    @Get('order/:orderCode')
    async getOrder(@Param('orderCode') orderCode: string, @Res() res: Response) {
        if (!orderCode) {
            return res.status(400).json({ success: false, error: 'orderCode is required' });
        }

        try {
            const ctx = await this.requestContextService.create({ apiType: 'admin' });
            const order = await this.orderService.findOneByCode(ctx, orderCode);

            if (!order) {
                return res.status(404).json({ success: false, error: `Order "${orderCode}" not found` });
            }

            const customFields = (order.customFields ?? {}) as Record<string, unknown>;

            console.log(`[mock-logistics] GET /order/${orderCode} — customFields retrieved`);

            return res.status(200).json({ success: true, data: customFields });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to retrieve order';
            console.error(`[mock-logistics] GET /order/${orderCode} error: ${message}`);
            return res.status(500).json({ success: false, error: message });
        }
    }
}
