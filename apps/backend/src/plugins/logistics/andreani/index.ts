import { AndreaniService } from './andreani.service';
import { AndreaniOrderService } from './andreani-order.service';
import { AndreaniShipmentService } from './andreani-shipment.service';
import { AndreaniClient } from './andreani.client';
import { OrderService, RequestContextService } from '@vendure/core';
import { getAndreaniConfigFromEnv } from './andreani.config';

let andreaniService: AndreaniService | null = null;
let andreaniOrderService: AndreaniOrderService | null = null;
let andreaniShipmentService: AndreaniShipmentService | null = null;

export function initAndreani(orderService: OrderService, requestContextService: RequestContextService): boolean {
    const config = getAndreaniConfigFromEnv();
    if (!config.enabled) {
        andreaniService = null;
        andreaniOrderService = null;
        andreaniShipmentService = null;
        console.log('[andreani] Andreani integration is disabled via config.');
        return false;
    }

    andreaniService = new AndreaniService(config);
    andreaniOrderService = new AndreaniOrderService(orderService, requestContextService);
    const client = new AndreaniClient(config);
    andreaniShipmentService = new AndreaniShipmentService(client, config, orderService, requestContextService);
    console.log('[andreani] Andreani integration initialized.');
    return true;
}

export function getAndreaniService(): AndreaniService | null {
    return andreaniService;
}

export function getAndreaniOrderService(): AndreaniOrderService | null {
    return andreaniOrderService;
}

export function getAndreaniShipmentService(): AndreaniShipmentService | null {
    return andreaniShipmentService;
}
