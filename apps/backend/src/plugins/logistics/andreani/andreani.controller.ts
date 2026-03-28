import { AndreaniQuoteRequest, AndreaniQuoteResponse, AndreaniSelectionPayload, AndreaniSelectionResponse } from './andreani.dto';
import { AndreaniService } from './andreani.service';
import { AndreaniOrderService } from './andreani-order.service';

interface CreateAndreaniHandlersOptions {
    enabled: boolean;
    service?: AndreaniService | null;
    selectionService?: AndreaniOrderService | null;
}

export function createAndreaniHandlers({ enabled, service, selectionService }: CreateAndreaniHandlersOptions) {
    async function createQuote(req: { body: any }, res: { status(code: number): any; json(data: any): void }): Promise<void> {
        if (!enabled || !service) {
            res.status(503).json({ success: false, error: 'Andreani está deshabilitado.' });
            return;
        }

        const payload: AndreaniQuoteRequest = {
            destinationPostalCode: req.body.destinationPostalCode,
            destinationCity: req.body.destinationCity,
            destinationCountryCode: req.body.destinationCountryCode,
            weightKg: Number(req.body.weightKg),
            heightCm: req.body.heightCm ? Number(req.body.heightCm) : undefined,
            widthCm: req.body.widthCm ? Number(req.body.widthCm) : undefined,
            lengthCm: req.body.lengthCm ? Number(req.body.lengthCm) : undefined,
            volume: req.body.volume ? Number(req.body.volume) : undefined,
            declaredValue: req.body.declaredValue ? Number(req.body.declaredValue) : undefined,
            orderTotal: req.body.orderTotal ? Number(req.body.orderTotal) : undefined,
            categoryId: req.body.categoryId ? String(req.body.categoryId) : undefined,
        };

        const response: AndreaniQuoteResponse = await service.quote(payload);
        const statusCode = response.success ? 200 : (response.error?.startsWith('Andreani HTTP') ? 502 : 400);
        res.status(statusCode).json(response);
    }

    async function persistSelection(req: { body: any }, res: { status(code: number): any; json(data: any): void }): Promise<void> {
        if (!enabled || !selectionService) {
            res.status(503).json({ success: false, error: 'Andreani está deshabilitado.' });
            return;
        }

        const payload: AndreaniSelectionPayload = {
            orderId: req.body.orderId,
            orderCode: req.body.orderCode,
            carrier: req.body.carrier,
            serviceCode: req.body.serviceCode,
            serviceName: req.body.serviceName,
            price: Number(req.body.price),
            currency: req.body.currency,
            destinationPostalCode: req.body.destinationPostalCode,
            destinationCity: req.body.destinationCity,
            metadata: req.body.metadata,
            weightKg: req.body.weightKg ? Number(req.body.weightKg) : undefined,
            heightCm: req.body.heightCm ? Number(req.body.heightCm) : undefined,
            lengthCm: req.body.lengthCm ? Number(req.body.lengthCm) : undefined,
            widthCm: req.body.widthCm ? Number(req.body.widthCm) : undefined,
            volume: req.body.volume ? Number(req.body.volume) : undefined,
        };

        try {
            if (!payload.orderId && !payload.orderCode) {
                throw new Error('orderId or orderCode is required to persist Andreani selection.');
            }
            const order = await selectionService.persistSelection(payload);
            const response: AndreaniSelectionResponse = {
                success: true,
                orderId: String(order.id),
            };
            res.status(200).json(response);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to persist Andreani selection';
            console.error('[andreani] Selection persistence failed:', message);
            res.status(400).json({ success: false, error: message });
        }
    }

    async function getOrderLogistics(req: { params: { orderCode: string } }, res: { status(code: number): any; json(data: any): void }): Promise<void> {
        if (!enabled || !selectionService) {
            res.status(200).json({ success: true, enabled: false, data: {} });
            return;
        }

        if (!req.params.orderCode) {
            res.status(400).json({ success: false, error: 'orderCode es requerido.' });
            return;
        }

        const logistics = await selectionService.getLogistics(req.params.orderCode);
        if (!logistics) {
            res.status(404).json({ success: false, error: 'Order or logistics data not found' });
            return;
        }
        res.status(200).json({ success: true, data: logistics });
    }

    return {
        createQuote,
        persistSelection,
        getOrderLogistics,
    };
}
