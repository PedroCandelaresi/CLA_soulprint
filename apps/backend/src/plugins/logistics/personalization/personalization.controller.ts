import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Query,
    Req,
    Res,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionService } from '@vendure/core';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { getPersonalizationConfigFromEnv } from './personalization.config';
import { PersonalizationService } from './personalization.service';
import type { UploadedPersonalizationFile } from './personalization.types';

const uploadConfig = getPersonalizationConfigFromEnv();

function mapError(error: unknown): Error {
    return error instanceof Error ? error : new Error('No se pudo procesar la solicitud.');
}

function getMappedStatusCode(error: unknown): number {
    const { message } = mapError(error);
    if (message.includes('No autorizado')) return 401;
    if (message.includes('no existe') || message.includes('no encontrada')) return 404;
    return 400;
}

@Controller('logistics/personalization')
export class PersonalizationController {
    constructor(
        private readonly personalizationService: PersonalizationService,
        private readonly sessionService: SessionService,
    ) {}

    private async getCustomerUserId(req?: Request): Promise<string | undefined> {
        const sessionToken = (req as Request & { session?: { token?: string } })?.session?.token;
        if (!sessionToken) return undefined;
        const session = await this.sessionService.getSessionFromToken(sessionToken);
        const userId = session?.user?.id;
        return userId ? String(userId) : undefined;
    }

    /**
     * GET /logistics/personalization/order/:orderCode
     * Returns overall status + per-line personalization data.
     */
    @Get('order/:orderCode')
    async getOrderPersonalization(
        @Param('orderCode') orderCode: string,
        @Query('transactionId') transactionId?: string,
        @Query('accessToken') accessToken?: string,
        @Req() req?: Request,
        @Res() res?: Response,
    ) {
        try {
            const customerUserId = await this.getCustomerUserId(req);
            const data = await this.personalizationService.getOrderPersonalization({
                orderCode,
                transactionId,
                accessToken,
                customerUserId,
            });
            return res?.status(200).json({ success: true, data });
        } catch (error) {
            return res?.status(getMappedStatusCode(error)).json({
                success: false,
                error: mapError(error).message,
            });
        }
    }

    /**
     * POST /logistics/personalization/upload
     * Upload an image for a specific OrderLine.
     *
     * Body (multipart/form-data):
     *   - file         (required)
     *   - orderCode    (required)
     *   - orderLineId  (required)
     *   - accessToken  (optional)
     *   - transactionId (optional)
     *   - notes        (optional)
     */
    @Post('upload')
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: {
            fileSize: uploadConfig.maxFileSizeBytes,
            files: 1,
        },
    }))
    async uploadPersonalization(
        @UploadedFile() file: UploadedPersonalizationFile | undefined,
        @Body() body?: Record<string, unknown>,
        @Req() req?: Request,
        @Res() res?: Response,
    ) {
        const orderCode = typeof body?.orderCode === 'string' ? body.orderCode.trim() : '';
        const orderLineId = typeof body?.orderLineId === 'string' ? body.orderLineId.trim() : '';
        const notes = typeof body?.notes === 'string' ? body.notes : undefined;
        const transactionId = typeof body?.transactionId === 'string' ? body.transactionId : undefined;
        const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : undefined;

        if (!orderCode) {
            return res?.status(400).json({ success: false, error: 'Falta el código de orden.' });
        }
        if (!orderLineId) {
            return res?.status(400).json({ success: false, error: 'Falta el ID de línea de orden (orderLineId).' });
        }
        if (!file) {
            return res?.status(400).json({ success: false, error: 'Debes seleccionar un archivo.' });
        }

        try {
            const customerUserId = await this.getCustomerUserId(req);
            const data = await this.personalizationService.uploadForLine({
                orderCode,
                orderLineId,
                notes,
                transactionId,
                accessToken,
                customerUserId,
                file,
            });
            return res?.status(200).json({ success: true, data });
        } catch (error) {
            return res?.status(getMappedStatusCode(error)).json({
                success: false,
                error: mapError(error).message,
            });
        }
    }
}
