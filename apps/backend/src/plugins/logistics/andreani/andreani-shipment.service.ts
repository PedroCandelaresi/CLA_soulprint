import { OrderService, RequestContextService } from '@vendure/core';
import type { Order } from '@vendure/core';
import { AndreaniClient } from './andreani.client';
import { AndreaniConfig } from './andreani.config';
import { AndreaniShipmentRequest, AndreaniShipmentResponse } from './andreani.dto';

export class AndreaniShipmentService {
    constructor(
        private client: AndreaniClient,
        private config: AndreaniConfig,
        private orderService: OrderService,
        private requestContextService: RequestContextService,
    ) {}

    async createShipment(order: Order): Promise<AndreaniShipmentResponse> {
        const selection = (order.customFields || {}) as Record<string, unknown>;
        if (selection.andreaniShipmentCreated === true) {
            return {
                success: false,
                error: 'Andreani shipment already created for this order.',
            };
        }

        if (
            !selection.andreaniCarrier ||
            !selection.andreaniServiceCode ||
            !selection.andreaniDestinationPostalCode ||
            !selection.andreaniDestinationCity
        ) {
            return { success: false, error: 'Andreani selection incomplete on order.' };
        }

        const payload = this.buildShipmentRequest(order, selection);

        try {
            const response = await this.client.createShipment(payload);
            await this.appendShipmentFields(order, response);
            return {
                success: true,
                trackingNumber: response.NumeroGuiaHija ?? response.NumeroGuia,
                shipmentId: response.IdEnvio,
                response,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Andreani shipment creation failed';
            console.error('[andreani] Shipment creation failed:', message);
            return { success: false, error: message };
        }
    }

    private buildShipmentRequest(order: Order, selection: Record<string, unknown>): AndreaniShipmentRequest {
        const shippingAddress = order.shippingAddress;
        const clienteName = [shippingAddress?.fullName].filter(Boolean).join(' ') || 'Cliente';
        const pesoKg = Number(selection['andreaniWeightKg'] ?? 0) || 1;
        const dimensions = this.parseDimensions(selection['andreaniDimensions'] as string | undefined);

        return {
            orderId: String(order.id),
            contrato: this.config.contractCode,
            cliente: this.config.clientCode,
            cpOrigen: this.config.originPostalCode,
            ciudadOrigen: this.config.originCity,
            provinciaOrigen: this.config.originProvince,
            destinoPostalCode: selection['andreaniDestinationPostalCode'] as string,
            destinoCiudad: selection['andreaniDestinationCity'] as string,
            pesoKg: pesoKg || 1,
            valorDeclarado: Number(selection['andreaniPrice'] ?? 0) || undefined,
            numeroBultos: 1,
            categoria: selection['andreaniServiceCode'] as string,
            volumen: dimensions.volume,
            altoCm: dimensions.heightCm,
            anchoCm: dimensions.widthCm,
            largoCm: dimensions.lengthCm,
            destinatario: {
                nombre: clienteName,
                telefono: shippingAddress?.phoneNumber,
                email: order.customer?.emailAddress,
                domicilio: [shippingAddress?.streetLine1, shippingAddress?.streetLine2].filter(Boolean).join(' '),
                provincia: shippingAddress?.province,
            },
        };
    }

    private async appendShipmentFields(order: Order, response: Record<string, unknown>): Promise<void> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const shipmentFields: Record<string, unknown> = {
            andreaniShipmentCreated: true,
            andreaniShipmentDate: new Date().toISOString(),
            andreaniTrackingNumber: response.NumeroGuiaHija ?? response.NumeroGuia,
            andreaniShipmentId: response.IdEnvio,
            andreaniShipmentStatus: response.Estado,
            andreaniShipmentRawResponse: JSON.stringify(response),
        };
        await this.orderService.updateCustomFields(ctx, order.id, shipmentFields);
    }

    private parseDimensions(value?: string): {
        heightCm?: number;
        widthCm?: number;
        lengthCm?: number;
        volume?: number;
    } {
        if (!value) {
            return {};
        }
        try {
            const parsed = JSON.parse(value) as Record<string, number>;
            return {
                heightCm: parsed.heightCm,
                widthCm: parsed.widthCm,
                lengthCm: parsed.lengthCm,
                volume: parsed.volume,
            };
        } catch {
            return {};
        }
    }
}
