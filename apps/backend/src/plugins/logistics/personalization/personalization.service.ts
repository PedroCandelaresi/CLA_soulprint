import { Readable } from 'node:stream';
import { Inject, Injectable, Optional } from '@nestjs/common';
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
import { PersonalizationConfig, PERSONALIZATION_CONFIG_OPTIONS } from './personalization.config';
import {
    PersonalizationLineStatus,
    PersonalizationOverallStatus,
    PersonalizationOrderData,
    PersonalizationLineData,
    PersonalizationOrderAccess,
    PersonalizationLineUploadInput,
    UploadedPersonalizationFile,
    PersonalizationSideMode,
    PersonalizationBackMode,
} from './personalization.types';
import {
    buildPersonalizationToken,
    isValidPersonalizationToken,
    normalizeMimeType,
    sanitizeNotes,
} from './personalization.utils';
import { PersonalizationReceivedEvent } from './personalization.event';
import {
    PERSONALIZATION_PSP_RESOLVER,
    NoopPersonalizationPspResolver,
    type PersonalizationPspResolver,
} from './adapters/psp-resolver';

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
const REQUIRED_LINE_PENDING_STATUSES = new Set<PersonalizationLineStatus>(['not-required', 'pending-upload']);

@Injectable()
export class PersonalizationService {
    private readonly pspResolver: PersonalizationPspResolver;

    constructor(
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
        private readonly assetService: AssetService,
        private readonly eventBus: EventBus,
        private readonly connection: TransactionalConnection,
        @Inject(PERSONALIZATION_CONFIG_OPTIONS)
        private readonly config: PersonalizationConfig,
        @Optional()
        @Inject(PERSONALIZATION_PSP_RESOLVER)
        pspResolver?: PersonalizationPspResolver,
    ) {
        this.pspResolver = pspResolver ?? NoopPersonalizationPspResolver;
    }

    getUploadConstraints(): Pick<PersonalizationConfig, 'allowedMimeTypes' | 'maxFileSizeBytes'> {
        return {
            allowedMimeTypes: this.config.allowedMimeTypes,
            maxFileSizeBytes: this.config.maxFileSizeBytes,
        };
    }

    async syncOrderAfterPayment(orderCode: string): Promise<void> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, orderCode);
        if (!order) return;
        await this.syncLineStatuses(ctx, order);
        await this.syncOverallStatus(ctx, order);
    }

    async getOrderPersonalization(access: PersonalizationOrderAccess): Promise<PersonalizationOrderData> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, access.orderCode);
        if (!order) throw new Error('La orden no existe.');

        await this.authorize(access, order, false);
        const syncedOrder = (await this.syncLineStatuses(ctx, order)) ?? order;
        await this.syncOverallStatus(ctx, syncedOrder);

        const token = buildPersonalizationToken(order.code, this.config.tokenSecret);
        const finalOrder = (await this.loadOrder(ctx, access.orderCode)) ?? syncedOrder;
        return this.mapToResponse(finalOrder, token);
    }

    async uploadForLine(input: PersonalizationLineUploadInput): Promise<PersonalizationOrderData> {
        this.validateFile(input.file);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrder(ctx, input.orderCode);
        if (!order) throw new Error('La orden no existe.');

        await this.authorize(input, order, false);

        const line = this.getLines(order).find(l => String(l.id) === String(input.orderLineId));
        if (!line) throw new Error('Línea de orden no encontrada.');
        if (!this.lineRequiresPersonalization(line)) {
            throw new Error('Este producto no requiere personalización.');
        }

        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        const side = input.side ?? 'front';

        // Validate that the requested side actually requires an image
        if (side === 'front') {
            const frontMode = (cf['frontMode'] as string) ?? 'image';
            if (frontMode !== 'image') throw new Error('El frente de esta línea usa texto, no imagen.');
        } else {
            const backMode = (cf['backMode'] as string) ?? 'none';
            if (backMode !== 'image') throw new Error('El dorso de esta línea no requiere imagen.');
        }

        const stream = Readable.from(input.file.buffer);
        const assetResult = await this.assetService.createFromFileStream(stream, input.file.originalname, ctx);
        if (!('id' in assetResult)) throw new Error('Vendure no pudo procesar el archivo subido.');

        if (side === 'front') {
            const prevAsset = this.getLineFrontAsset(line);
            if (prevAsset?.id && prevAsset.id !== assetResult.id) {
                try { await this.assetService.delete(ctx, [prevAsset.id], true, true); } catch { /* noop */ }
            }
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
                },
            );
        } else {
            const prevBackAsset = this.getLineBackAsset(line);
            if (prevBackAsset?.id && prevBackAsset.id !== assetResult.id) {
                try { await this.assetService.delete(ctx, [prevBackAsset.id], true, true); } catch { /* noop */ }
            }
            await this.connection.getRepository(ctx, OrderLine).update(
                { id: line.id as any },
                {
                    customFields: {
                        personalizationBackStatus: 'uploaded' as PersonalizationLineStatus,
                        personalizationBackAsset: { id: assetResult.id } as any,
                        personalizationBackUploadedAt: new Date(),
                        personalizationBackSnapshotFileName: input.file.originalname,
                    } as any,
                },
            );
        }

        const reloadedOrder = await this.loadOrder(ctx, input.orderCode);
        if (reloadedOrder) {
            await this.syncOverallStatus(ctx, reloadedOrder);
        }

        const latestOrder = await this.loadOrder(ctx, input.orderCode);
        if (latestOrder) {
            const overallStatus = this.deriveOverallStatus(latestOrder);
            if (overallStatus === 'complete') {
                try {
                    await this.eventBus.publish(new PersonalizationReceivedEvent(ctx, latestOrder, String(line.id)));
                } catch {
                    console.warn(`${LOG_PREFIX} Failed to publish PersonalizationReceivedEvent`);
                }
            }
        }

        const finalOrder = await this.loadOrder(ctx, input.orderCode) ?? order;
        const token = buildPersonalizationToken(order.code, this.config.tokenSecret);
        return this.mapToResponse(finalOrder, token);
    }

    private async loadOrder(
        ctx: Awaited<ReturnType<RequestContextService['create']>>,
        orderCode: string,
    ): Promise<Order | undefined> {
        return this.orderService.findOneByCode(ctx, orderCode, [...ORDER_RELATIONS]);
    }

    private lineRequiresPersonalization(line: OrderLine): boolean {
        const variantCf = (line.productVariant?.customFields ?? {}) as Record<string, unknown>;
        if (variantCf['requiresPersonalization'] === true) {
            return true;
        }
        return this.config.requireUploadByDefault;
    }

    private orderRequiresPersonalization(order: Order): boolean {
        return this.getLines(order).some(line => this.lineRequiresPersonalization(line));
    }

    private getLines(order: Order): OrderLine[] {
        return (order.lines ?? []) as OrderLine[];
    }

    private getLineFrontAsset(line: OrderLine): Asset | undefined {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        const asset = cf['personalizationAsset'];
        return asset && typeof asset === 'object' ? (asset as Asset) : undefined;
    }

    // Legacy alias
    private getLineAsset(line: OrderLine): Asset | undefined {
        return this.getLineFrontAsset(line);
    }

    private getLineBackAsset(line: OrderLine): Asset | undefined {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        const asset = cf['personalizationBackAsset'];
        return asset && typeof asset === 'object' ? (asset as Asset) : undefined;
    }

    private getLineFrontMode(line: OrderLine): PersonalizationSideMode {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        return ((cf['frontMode'] as string) === 'text' ? 'text' : 'image') as PersonalizationSideMode;
    }

    private getLineBackMode(line: OrderLine): PersonalizationBackMode {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        const raw = cf['backMode'] as string | undefined;
        if (raw === 'text') return 'text';
        if (raw === 'image') return 'image';
        return 'none';
    }

    private frontIsComplete(line: OrderLine): boolean {
        if (this.getLineFrontMode(line) === 'text') return true;
        const status = this.getStoredFrontStatus(line);
        return status === 'uploaded' || status === 'approved';
    }

    private backIsComplete(line: OrderLine): boolean {
        const backMode = this.getLineBackMode(line);
        if (backMode === 'none' || backMode === 'text') return true;
        const status = this.getStoredBackStatus(line);
        return status === 'uploaded' || status === 'approved';
    }

    private getStoredFrontStatus(line: OrderLine): PersonalizationLineStatus {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        return (cf['personalizationStatus'] as PersonalizationLineStatus) ?? 'not-required';
    }

    private getStoredBackStatus(line: OrderLine): PersonalizationLineStatus {
        const cf = (line.customFields ?? {}) as Record<string, unknown>;
        return (cf['personalizationBackStatus'] as PersonalizationLineStatus) ?? 'not-required';
    }

    // Legacy alias
    private getStoredLineStatus(line: OrderLine): PersonalizationLineStatus {
        return this.getStoredFrontStatus(line);
    }

    private getEffectiveLineStatus(line: OrderLine): PersonalizationLineStatus {
        if (!this.lineRequiresPersonalization(line)) return 'not-required';
        if (this.frontIsComplete(line) && this.backIsComplete(line)) {
            // Both sides done — return the front status (uploaded/approved)
            const s = this.getStoredFrontStatus(line);
            return s === 'not-required' ? 'uploaded' : s;
        }
        // Still pending
        return 'pending-upload';
    }

    private deriveOverallStatus(order: Order): PersonalizationOverallStatus {
        const lines = this.getLines(order);
        const required = lines.filter(l => this.lineRequiresPersonalization(l));
        if (required.length === 0) return 'not-required';

        const complete = required.filter(l => this.frontIsComplete(l) && this.backIsComplete(l));

        if (complete.length === 0) return 'pending';
        if (complete.length < required.length) return 'partial';
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
            const currentStatus = this.getStoredFrontStatus(line);

            if (!shouldRequire && currentStatus !== 'not-required') {
                await this.connection.getRepository(ctx, OrderLine).update(
                    { id: line.id as any },
                    { customFields: { personalizationStatus: 'not-required', personalizationBackStatus: 'not-required' } as any },
                );
                changed = true;
            } else if (shouldRequire && currentStatus === 'not-required') {
                // Only set to pending if an image is actually needed
                const frontNeedsUpload = this.getLineFrontMode(line) === 'image';
                const backNeedsUpload = this.getLineBackMode(line) === 'image';
                const updates: Record<string, unknown> = {};
                if (frontNeedsUpload) updates['personalizationStatus'] = 'pending-upload';
                if (backNeedsUpload) updates['personalizationBackStatus'] = 'pending-upload';
                if (Object.keys(updates).length > 0) {
                    await this.connection.getRepository(ctx, OrderLine).update(
                        { id: line.id as any },
                        { customFields: updates as any },
                    );
                    changed = true;
                }
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
        const currentStatus = (cf['personalizationOverallStatus'] as string) ?? 'not-required';

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
            ? await this.pspResolver.findTransactionById(access.transactionId)
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
        const overallPersonalizationStatus = this.deriveOverallStatus(order);

        const lineItems: PersonalizationLineData[] = lines.map(line => {
            const cf = (line.customFields ?? {}) as Record<string, unknown>;
            const frontAsset = this.getLineFrontAsset(line);
            const backAsset = this.getLineBackAsset(line);

            const toAssetSummary = (a: Asset | undefined) => a
                ? { id: String(a.id), source: a.source, preview: a.preview, mimeType: a.mimeType, fileSize: a.fileSize }
                : null;

            return {
                orderLineId: String(line.id),
                productName: line.productVariant?.product?.name ?? 'Producto',
                variantName: line.productVariant?.name ?? '',
                quantity: line.quantity,
                requiresPersonalization: this.lineRequiresPersonalization(line),
                personalizationStatus: this.getEffectiveLineStatus(line),
                // Frente
                frontMode: this.getLineFrontMode(line),
                frontText: (cf['frontText'] as string | undefined) ?? null,
                frontAsset: toAssetSummary(frontAsset),
                frontUploadedAt: this.formatDate(cf['personalizationUploadedAt'] as Date | string | undefined),
                frontSnapshotFileName: (cf['personalizationSnapshotFileName'] as string | undefined) ?? null,
                // Dorso
                backMode: this.getLineBackMode(line),
                backText: (cf['backText'] as string | undefined) ?? null,
                backAsset: toAssetSummary(backAsset),
                backStatus: this.getStoredBackStatus(line),
                backUploadedAt: this.formatDate(cf['personalizationBackUploadedAt'] as Date | string | undefined),
                backSnapshotFileName: (cf['personalizationBackSnapshotFileName'] as string | undefined) ?? null,
                // Legacy aliases
                asset: toAssetSummary(frontAsset),
                notes: (cf['personalizationNotes'] as string | undefined) ?? null,
                uploadedAt: this.formatDate(cf['personalizationUploadedAt'] as Date | string | undefined),
                snapshotFileName: (cf['personalizationSnapshotFileName'] as string | undefined) ?? null,
            };
        });

        const lastPayment = order.payments?.[order.payments.length - 1];
        const fulfillment = order.fulfillments?.[order.fulfillments.length - 1];

        return {
            orderCode: order.code,
            overallPersonalizationStatus,
            paymentState: lastPayment?.state ?? order.state,
            shipmentState: (orderCf['shipmentStatus'] as string) ?? fulfillment?.state ?? null,
            trackingNumber: (orderCf['trackingNumber'] as string) ?? null,
            accessToken,
            requiresPersonalization: this.orderRequiresPersonalization(order),
            lines: lineItems,
        };
    }

    private formatDate(value: Date | string | undefined): string | null {
        if (!value) return null;
        const d = value instanceof Date ? value : new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    private validateFile(file: UploadedPersonalizationFile): void {
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
