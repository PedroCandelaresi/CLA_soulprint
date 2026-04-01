import { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import {
    Asset,
    AssetService,
    EventBus,
    Order,
    OrderLine,
    OrderService,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';
import type { GetnetService } from '../../payments/getnet';
import { PersonalizationConfig, PERSONALIZATION_CONFIG_OPTIONS } from './personalization.config';
import {
    PersonalizationLineStatus,
    PersonalizationOrderData,
    PersonalizationLineData,
    PersonalizationOrderAccess,
    PersonalizationUploadInput,
    PersonalizationLineUploadInput,
} from './personalization.types';
import {
    buildPersonalizationToken,
    isValidPersonalizationToken,
    normalizeMimeType,
    sanitizeNotes,
} from './personalization.utils';
import { PersonalizationReceivedEvent } from '../../orders/business-status/personalization-received.event';

const LOG_PREFIX = '[personalization]';

const ORDER_RELATIONS = [
    'customer',
    'customer.user',
    'lines',
    'lines.productVariant',
    'lines.productVariant.product',
    'payments',
    'fulfillments',
] as const;

const PAID_PAYMENT_STATES = new Set(['Authorized', 'Settled']);

@Injectable()
export class PersonalizationService {
    private getnetService: GetnetService | null = null;

    constructor(
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
        private readonly assetService: AssetService,
        private readonly eventBus: EventBus,
        private readonly connection: TransactionalConnection,
        @Inject(PERSONALIZATION_CONFIG_OPTIONS)
        private readonly config: PersonalizationConfig,
    ) {}

    setGetnetService(service: GetnetService | null): void {
        this.getnetService = service;
    }

    getUploadConstraints(): Pick<PersonalizationConfig, 'allowedMimeTypes' | 'maxFileSizeBytes'> {
        return {
            allowedMimeTypes: this.config.allowedMimeTypes,
            maxFileSizeBytes: this.config.maxFileSizeBytes,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    async syncOrderAfterPayment(orderCode: string): Promise<void> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, orderCode);
        if (!order) return;
        await this.syncLineStatuses(ctx, order);
        await this.syncOverallStatus(ctx, order);
    }

    /** Returns personalization data for the whole order (all lines). */
    async getOrderPersonalization(access: PersonalizationOrderAccess): Promise<PersonalizationOrderData> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, access.orderCode);
        if (!order) throw new Error('La orden no existe.');

        await this.authorize(access, order, false);

        const refreshed = await this.syncLineStatuses(ctx, order);
        await this.syncOverallStatus(ctx, refreshed ?? order);
        const finalOrder = await this.loadOrder(ctx, access.orderCode) ?? order;

        const token = buildPersonalizationToken(order.code, this.config.tokenSecret);
        return this.mapToResponse(finalOrder, token);
    }

    /** Uploads a file for a specific OrderLine. */
    async uploadForLine(input: PersonalizationLineUploadInput): Promise<PersonalizationOrderData> {
        this.validateFile(input.file);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, input.orderCode);
        if (!order) throw new Error('La orden no existe.');

        const authorization = await this.authorize(input, order, true);

        // Find the target line
        const line = this.getLines(order).find(l => String(l.id) === String(input.orderLineId));
        if (!line) throw new Error('Línea de orden no encontrada.');
        if (!this.lineRequiresPersonalization(line)) {
            throw new Error('Este producto no requiere personalización.');
        }

        // Upload new asset
        const stream = Readable.from(input.file.buffer);
        const assetResult = await this.assetService.createFromFileStream(stream, input.file.originalname, ctx);
        if (!('id' in assetResult)) throw new Error('Vendure no pudo procesar el archivo subido.');

        // Clean up previous asset for this line
        const prevAsset = this.getLineAsset(line);
        if (prevAsset?.id && prevAsset.id !== assetResult.id) {
            try {
                await this.assetService.delete(ctx, [prevAsset.id], true, true);
            } catch {
                console.warn(`${LOG_PREFIX} Cleanup of previous asset failed`);
            }
        }

        // Persist to OrderLine via TypeORM (Vendure doesn't expose updateOrderLine customFields directly)
        await this.connection.getRepository(ctx, OrderLine).update(
            { id: line.id as any },
            {
                customFields: {
                    personalizationStatus: 'uploaded' as PersonalizationLineStatus,
                    personalizationAsset: { id: assetResult.id } as any,
                    personalizationNotes: sanitizeNotes(input.notes) ?? null,
                    personalizationUploadedAt: new Date(),
                    personalizationSnapshotFileName: input.file.originalname,
                    personalizationRejectedReason: null,
                } as any,
            }
        );

        // Re-derive and persist overall status on Order
        const reloadedOrder = await this.loadOrder(ctx, input.orderCode);
        if (reloadedOrder) {
            await this.syncOverallStatus(ctx, reloadedOrder);
        }

        // Emit event if all required lines now have uploads
        const latestOrder = await this.loadOrder(ctx, input.orderCode);
        if (latestOrder) {
            const overallStatus = this.deriveOverallStatus(latestOrder);
            if (overallStatus === 'complete') {
                try {
                    await this.eventBus.publish(new PersonalizationReceivedEvent(ctx, latestOrder));
                } catch {
                    console.warn(`${LOG_PREFIX} Failed to publish PersonalizationReceivedEvent`);
                }
            }
        }

        const finalOrder = await this.loadOrder(ctx, input.orderCode) ?? order;
        const token = buildPersonalizationToken(order.code, this.config.tokenSecret);
        return this.mapToResponse(finalOrder, token);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async loadOrder(
        ctx: Awaited<ReturnType<RequestContextService['create']>>,
        orderCode: string,
    ): Promise<Order | undefined> {
        return this.orderService.findOneByCode(ctx, orderCode, [...ORDER_RELATIONS]);
    }

    /** CORRECCIÓN CRÍTICA: verificar el customField del variant, no solo length > 0 */
    private lineRequiresPersonalization(line: OrderLine): boolean {
        const variantCf = (line.productVariant?.customFields ?? {}) as Record<string, unknown>;
        return variantCf['requiresPersonalization'] === true;
    }

    private getLines(order: Order): OrderLine[] {
        return (order.lines ?? []) as OrderLine[];
    }

    private getLineAsset(line: OrderLine): Asset | undefined {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        const asset = cf['personalizationAsset'];
        return asset && typeof asset === 'object' ? (asset as Asset) : undefined;
    }

    private getLineStatus(line: OrderLine): PersonalizationLineStatus {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        return (cf['personalizationStatus'] as PersonalizationLineStatus) ?? 'not-required';
    }

    private deriveOverallStatus(order: Order): string {
        const lines = this.getLines(order);
        const required = lines.filter(l => this.lineRequiresPersonalization(l));
        if (required.length === 0) return 'not-required';

        const uploaded = required.filter(l =>
            ['uploaded', 'approved'].includes(this.getLineStatus(l))
        );

        if (uploaded.length === 0) return 'pending';
        if (uploaded.length < required.length) return 'partial';
        return 'complete';
    }

    private async syncLineStatuses(
        ctx: Awaited<ReturnType<RequestContextService['create']>>,
        order: Order,
    ): Promise<Order | null> {
        const lines = this.getLines(order);
        let changed = false;

        for (const line of lines) {
            const shouldRequire = this.lineRequiresPersonalization(line);
            const currentStatus = this.getLineStatus(line);
            const expectedStatus: PersonalizationLineStatus = shouldRequire ? 'pending-upload' : 'not-required';

            // Only update if status is default and needs to be set
            if (!shouldRequire && currentStatus !== 'not-required') {
                await this.connection.getRepository(ctx, OrderLine).update(
                    { id: line.id as any },
                    { customFields: { personalizationStatus: 'not-required' } as any }
                );
                changed = true;
            } else if (shouldRequire && currentStatus === 'not-required') {
                await this.connection.getRepository(ctx, OrderLine).update(
                    { id: line.id as any },
                    { customFields: { personalizationStatus: 'pending-upload' } as any }
                );
                changed = true;
            }
        }

        return changed ? (await this.loadOrder(ctx, order.code)) ?? null : null;
    }

    private async syncOverallStatus(
        ctx: Awaited<ReturnType<RequestContextService['create']>>,
        order: Order,
    ): Promise<void> {
        const newStatus = this.deriveOverallStatus(order);
        const cf = (order.customFields ?? {}) as Record<string, unknown>;
        const currentStatus = cf['personalizationOverallStatus'] as string ?? 'not-required';

        if (currentStatus === newStatus) return;

        await this.orderService.updateCustomFields(ctx, order.id, {
            personalizationOverallStatus: newStatus,
        });
    }

    private isPaidOrder(order: Order, transactionStatus?: string): boolean {
        if ((order.payments ?? []).some(p => PAID_PAYMENT_STATES.has(p.state))) return true;
        return transactionStatus === 'approved';
    }

    private isOwnedByCustomer(order: Order, customerUserId?: string): boolean {
        if (!customerUserId) return false;
        if (!order.customer?.user?.id) return false;
        return String(order.customer.user.id) === String(customerUserId);
    }

    private async authorize(
        access: PersonalizationOrderAccess,
        order: Order,
        requirePaid: boolean,
    ): Promise<{ accessToken: string }> {
        const hasValidToken = isValidPersonalizationToken(order.code, access.accessToken, this.config.tokenSecret);
        const transaction = access.transactionId
            ? await this.getnetService?.findTransactionById(access.transactionId)
            : null;
        const customerOwns = this.isOwnedByCustomer(order, access.customerUserId);

        if (transaction && transaction.vendureOrderCode !== order.code) {
            throw new Error('La transacción no corresponde a la orden indicada.');
        }

        if (!hasValidToken && !transaction && !customerOwns) {
            throw new Error('No autorizado para consultar esta orden.');
        }

        if (requirePaid && !this.isPaidOrder(order, transaction?.status)) {
            throw new Error('La orden todavía no tiene un pago acreditado.');
        }

        return { accessToken: buildPersonalizationToken(order.code, this.config.tokenSecret) };
    }

    private mapToResponse(order: Order, accessToken: string): PersonalizationOrderData {
        const orderCf = (order.customFields ?? {}) as Record<string, unknown>;
        const lines = this.getLines(order);

        const lineItems: PersonalizationLineData[] = lines.map(line => {
            const cf = (line.customFields ?? {}) as Record<string, unknown>;
            const asset = this.getLineAsset(line);
            return {
                orderLineId: String(line.id),
                productName: line.productVariant?.product?.name ?? 'Producto',
                variantName: line.productVariant?.name ?? '',
                requiresPersonalization: this.lineRequiresPersonalization(line),
                personalizationStatus: this.getLineStatus(line),
                asset: asset
                    ? {
                        id: String(asset.id),
                        source: asset.source,
                        preview: asset.preview,
                        mimeType: asset.mimeType,
                        fileSize: asset.fileSize,
                    }
                    : null,
                notes: (cf['personalizationNotes'] as string | undefined) ?? null,
                uploadedAt: this.formatDate(cf['personalizationUploadedAt'] as Date | string | undefined),
                snapshotFileName: (cf['personalizationSnapshotFileName'] as string | undefined) ?? null,
            };
        });

        const lastPayment = order.payments?.[order.payments.length - 1];
        const fulfillment = order.fulfillments?.[order.fulfillments.length - 1];

        return {
            orderCode: order.code,
            overallPersonalizationStatus: (orderCf['personalizationOverallStatus'] as string) ?? 'not-required',
            paymentState: lastPayment?.state ?? order.state,
            shipmentState: (orderCf['andreaniShipmentStatus'] as string) ?? fulfillment?.state ?? null,
            trackingNumber: (orderCf['andreaniTrackingNumber'] as string) ?? null,
            accessToken,
            lines: lineItems,
        };
    }

    private formatDate(value: Date | string | undefined): string | null {
        if (!value) return null;
        const d = value instanceof Date ? value : new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    private validateFile(file: PersonalizationUploadInput['file']): void {
        if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
            throw new Error('Debes seleccionar un archivo.');
        }
        const mime = normalizeMimeType(file.mimetype);
        if (!this.config.allowedMimeTypes.includes(mime)) {
            throw new Error('El tipo de archivo no está permitido.');
        }
        if (file.size > this.config.maxFileSizeBytes) {
            const maxMb = Math.round(this.config.maxFileSizeBytes / (1024 * 1024));
            throw new Error(`El archivo supera el máximo permitido de ${maxMb} MB.`);
        }
    }
}
