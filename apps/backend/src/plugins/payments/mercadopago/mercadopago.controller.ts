import { Body, Controller, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import type { MercadoPagoWebhookPayload } from './mercadopago.types';

@Controller('payments/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mercadoPagoService: MercadoPagoService) {}

    @Post('webhook')
    @HttpCode(200)
    async handleWebhook(
        @Body() body: MercadoPagoWebhookPayload,
        @Query() query: Record<string, unknown>,
        @Headers('x-signature') signatureHeader?: string,
        @Headers('x-request-id') requestIdHeader?: string,
    ): Promise<{ received: true }> {
        await this.mercadoPagoService.handleWebhook({
            body,
            query,
            signatureHeader,
            requestIdHeader,
        });

        return { received: true };
    }
}
