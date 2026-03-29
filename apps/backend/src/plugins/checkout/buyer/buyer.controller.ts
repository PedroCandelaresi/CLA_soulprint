import {
    Body,
    Controller,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import { RequestContextService, SessionService } from '@vendure/core';
import type { Request, Response } from 'express';
import { BuyerCheckoutService } from './buyer.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function mapError(error: unknown): Error {
    return error instanceof Error ? error : new Error('No se pudieron guardar los datos del comprador.');
}

function getStatusCode(error: unknown): number {
    const message = mapError(error).message;
    if (message.includes('orden activa')) {
        return 400;
    }
    if (message.includes('autoriz')) {
        return 401;
    }
    return 400;
}

@Controller('checkout/buyer')
export class BuyerCheckoutController {
    constructor(
        private readonly buyerCheckoutService: BuyerCheckoutService,
        private readonly sessionService: SessionService,
        private readonly requestContextService: RequestContextService,
    ) {}

    @Post()
    async updateBuyerSnapshot(
        @Body() body?: Record<string, unknown>,
        @Req() req?: Request,
        @Res() res?: Response,
    ) {
        const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim() : '';
        const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';

        if (fullName.length < 3) {
            return res?.status(400).json({ success: false, error: 'Ingresá nombre y apellido del comprador.' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res?.status(400).json({ success: false, error: 'Ingresá un email válido.' });
        }
        if (getDigits(phone).length < 8) {
            return res?.status(400).json({ success: false, error: 'Ingresá un teléfono válido.' });
        }

        try {
            const sessionToken = (req as Request & { session?: { token?: string } })?.session?.token;
            const session = sessionToken ? await this.sessionService.getSessionFromToken(sessionToken) : undefined;
            const activeOrderId = session?.activeOrderId;

            if (!req || !session || !activeOrderId) {
                return res?.status(400).json({ success: false, error: 'No hay una orden activa para esta sesión.' });
            }

            const ctx = await this.requestContextService.fromRequest(req, undefined, [], session);
            if (!ctx.activeUserId) {
                return res?.status(401).json({
                    success: false,
                    error: 'Necesitás iniciar sesión con una cuenta verificada para continuar.',
                });
            }
            const data = await this.buyerCheckoutService.updateActiveOrderBuyer(ctx, String(activeOrderId), {
                fullName,
                email,
                phone,
            });

            return res?.status(200).json({ success: true, data });
        } catch (error) {
            const mapped = mapError(error);
            return res?.status(getStatusCode(error)).json({
                success: false,
                error: mapped.message,
            });
        }
    }
}
