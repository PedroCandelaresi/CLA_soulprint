import { AndreaniService } from './andreani.service';
import { AndreaniOrderService } from './andreani-order.service';
import { AndreaniShipmentService } from './andreani-shipment.service';
import { AndreaniClient } from './andreani.client';
import { AndreaniMockQuoteProvider } from './andreani-mock.provider';
import { AndreaniRealQuoteProvider } from './andreani-real.provider';
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

    const provider = config.mode === 'mock'
        ? new AndreaniMockQuoteProvider()
        : new AndreaniRealQuoteProvider(new AndreaniClient(config));

    andreaniService = new AndreaniService(config, provider);
    andreaniOrderService = new AndreaniOrderService(orderService, requestContextService);

    if (config.mode === 'real') {
        const client = new AndreaniClient(config);
        andreaniShipmentService = new AndreaniShipmentService(client, config, orderService, requestContextService);
    } else {
        andreaniShipmentService = null;
    }

    console.log(`[andreani] Andreani integration initialized in mode=${config.mode}.`);
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
