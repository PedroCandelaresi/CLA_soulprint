import { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import { Asset, AssetService, Order, OrderService, Payment, RequestContextService } from '@vendure/core';
import type { GetnetService } from '../../payments/getnet';
import { PersonalizationConfig, PERSONALIZATION_CONFIG_OPTIONS } from './personalization.config';
import {
    PersonalizationOrderAccess,
    PersonalizationOrderData,
    PersonalizationStatus,
    PersonalizationUploadInput,
} from './personalization.types';
import {
    buildPersonalizationToken,
    isValidPersonalizationToken,
    normalizeMimeType,
    sanitizeNotes,
} from './personalization.utils';

const PERSONALIZATION_ORDER_RELATIONS = [
    'customer',
    'customer.user',
    'lines',
    'lines.productVariant',
    'lines.productVariant.product',
    'payments',
    'fulfillments',
    'customFields.personalizationAsset',
] as const;

const PAID_PAYMENT_STATES = new Set(['Authorized', 'Settled']);

@Injectable()
export class PersonalizationService {
    private getnetService: GetnetService | null = null;

    constructor(
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
        private readonly assetService: AssetService,
        @Inject(PERSONALIZATION_CONFIG_OPTIONS)
        private readonly config: PersonalizationConfig,
    ) {}

    getUploadConstraints(): Pick<PersonalizationConfig, 'allowedMimeTypes' | 'maxFileSizeBytes'> {
        return {
            allowedMimeTypes: this.config.allowedMimeTypes,
            maxFileSizeBytes: this.config.maxFileSizeBytes,
        };
    }

    setGetnetService(service: GetnetService | null): void {
        this.getnetService = service;
    }

    async syncOrderAfterPayment(orderCode: string): Promise<void> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.loadOrderByCode(ctx, orderCode);
        if (!order) {
            return;
        }
        await this.syncDerivedFields(ctx, order);
    }

    async getOrderPersonalization(access: PersonalizationOrderAccess): Promise<PersonalizationOrderData> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        let order = await this.loadOrderByCode(ctx, access.orderCode);

        if (!order) {
            throw new Error('La orden no existe.');
        }

        const authorization = await this.authorize(access, order, false);
        order = await this.syncDerivedFields(ctx, order);

        return this.mapOrderToResponse(order, authorization.accessToken, authorization.transactionStatus);
    }

    async uploadPersonalization(input: PersonalizationUploadInput): Promise<PersonalizationOrderData> {
        this.validateFile(input.file);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        let order = await this.loadOrderByCode(ctx, input.orderCode);

        if (!order) {
            throw new Error('La orden no existe.');
        }

        const authorization = await this.authorize(input, order, true);
        order = await this.syncDerivedFields(ctx, order);

        if (!this.requiresPersonalization(order)) {
            throw new Error('La orden no requiere personalización.');
        }

        const currentAsset = this.getOrderAsset(order);
        const fileStream = Readable.from(input.file.buffer);
        const assetResult = await this.assetService.createFromFileStream(fileStream, input.file.originalname, ctx);

        if (!('id' in assetResult)) {
            throw new Error('Vendure no pudo procesar el archivo subido.');
        }

        const nextNotes = sanitizeNotes(input.notes) ?? this.getCustomFieldValue<string>(order, 'personalizationNotes') ?? undefined;
        await this.orderService.updateCustomFields(ctx, order.id, {
            personalizationRequired: true,
            personalizationStatus: 'uploaded',
            personalizationAsset: assetResult.id,
            personalizationAssetPreviewUrl: assetResult.preview,
            personalizationOriginalFilename: input.file.originalname,
            personalizationUploadedAt: new Date(),
            personalizationNotes: nextNotes,
        });

        if (currentAsset && currentAsset.id !== assetResult.id) {
            try {
                await this.assetService.delete(ctx, [currentAsset.id], true, true);
            } catch (error) {
                console.warn('[personalization] previous asset cleanup failed:', error);
            }
        }

        order = await this.loadOrderByCode(ctx, input.orderCode);
        if (!order) {
            throw new Error('La orden no pudo recargarse después de subir el archivo.');
        }

        return this.mapOrderToResponse(order, authorization.accessToken, authorization.transactionStatus);
    }

    private async authorize(
        access: PersonalizationOrderAccess,
        order: Order,
        requirePaidOrder: boolean,
    ): Promise<{ accessToken?: string; transactionStatus?: string }> {
        const hasValidToken = isValidPersonalizationToken(order.code, access.accessToken, this.config.tokenSecret);
        const transaction = access.transactionId
            ? await this.getnetService?.findTransactionById(access.transactionId)
            : null;
        const customerOwnsOrder = this.isOwnedByCustomer(order, access.customerUserId);

        if (transaction && transaction.vendureOrderCode !== order.code) {
            throw new Error('La transacción no corresponde a la orden indicada.');
        }

        if (!hasValidToken && !transaction && !customerOwnsOrder) {
            throw new Error('No autorizado para consultar esta orden.');
        }

        const isPaidOrder = this.isPaidOrder(order, transaction?.status);
        if (requirePaidOrder && !isPaidOrder) {
            throw new Error('La orden todavía no tiene un pago acreditado.');
        }

        return {
            accessToken: hasValidToken || isPaidOrder || customerOwnsOrder
                ? buildPersonalizationToken(order.code, this.config.tokenSecret)
                : undefined,
            transactionStatus: transaction?.status,
        };
    }

    private async loadOrderByCode(ctx: Awaited<ReturnType<RequestContextService['create']>>, orderCode: string): Promise<Order | undefined> {
        return this.orderService.findOneByCode(ctx, orderCode, [...PERSONALIZATION_ORDER_RELATIONS]);
    }

    private async syncDerivedFields(ctx: Awaited<ReturnType<RequestContextService['create']>>, order: Order): Promise<Order> {
        const requiresPersonalization = this.requiresPersonalization(order);
        const asset = this.getOrderAsset(order);
        const nextStatus: PersonalizationStatus = !requiresPersonalization
            ? 'not-required'
            : asset
                ? 'uploaded'
                : 'pending';

        const currentRequired = Boolean(this.getCustomFieldValue<boolean>(order, 'personalizationRequired'));
        const currentStatus = this.getCustomFieldValue<string>(order, 'personalizationStatus') ?? 'not-required';

        if (currentRequired === requiresPersonalization && currentStatus === nextStatus) {
            return order;
        }

        await this.orderService.updateCustomFields(ctx, order.id, {
            personalizationRequired: requiresPersonalization,
            personalizationStatus: nextStatus,
        });

        const reloadedOrder = await this.loadOrderByCode(ctx, order.code);
        return reloadedOrder ?? order;
    }

    private mapOrderToResponse(order: Order, accessToken?: string, transactionStatus?: string): PersonalizationOrderData {
        const asset = this.getOrderAsset(order);
        const lastPayment = order.payments?.[order.payments.length - 1];
        const status = (this.getCustomFieldValue<string>(order, 'personalizationStatus') ?? 'not-required') as PersonalizationStatus;

        return {
            orderCode: order.code,
            requiresPersonalization: Boolean(this.getCustomFieldValue<boolean>(order, 'personalizationRequired')),
            personalizationStatus: status,
            paymentState: this.getPaymentState(lastPayment, transactionStatus, order.state),
            shipmentState: this.getShipmentState(order),
            trackingNumber: this.getCustomFieldValue<string>(order, 'andreaniTrackingNumber') ?? null,
            originalFilename: this.getCustomFieldValue<string>(order, 'personalizationOriginalFilename') ?? null,
            uploadedAt: this.formatDate(this.getCustomFieldValue<Date | string>(order, 'personalizationUploadedAt')),
            notes: this.getCustomFieldValue<string>(order, 'personalizationNotes') ?? null,
            accessToken,
            asset: asset
                ? {
                    id: String(asset.id),
                    source: asset.source,
                    preview: asset.preview,
                    mimeType: asset.mimeType,
                    fileSize: asset.fileSize,
                }
                : null,
            requiredItems: (order.lines || [])
                .filter((line) => {
                    const customFields = (line.productVariant?.customFields || {}) as Record<string, unknown>;
                    return Boolean(customFields.requiresPersonalization);
                })
                .map((line) => ({
                    orderLineId: String(line.id),
                    productName: line.productVariant?.product?.name || line.productVariant?.name || 'Producto',
                    variantName: line.productVariant?.name || 'Variante',
                })),
        };
    }

    private requiresPersonalization(order: Order): boolean {
        return (order.lines || []).some((line) => {
            const customFields = (line.productVariant?.customFields || {}) as Record<string, unknown>;
            return Boolean(customFields.requiresPersonalization);
        });
    }

    private getOrderAsset(order: Order): Asset | undefined {
        const customFields = (order.customFields || {}) as Record<string, unknown>;
        const asset = customFields.personalizationAsset;
        return asset && typeof asset === 'object' ? asset as Asset : undefined;
    }

    private getPaymentState(payment: Payment | undefined, transactionStatus: string | undefined, orderState: string): string {
        return payment?.state || transactionStatus || orderState;
    }

    private getShipmentState(order: Order): string | null {
        const customFieldShipmentState = this.getCustomFieldValue<string>(order, 'andreaniShipmentStatus');
        if (customFieldShipmentState) {
            return customFieldShipmentState;
        }
        const fulfillment = order.fulfillments?.[order.fulfillments.length - 1];
        return fulfillment?.state || null;
    }

    private getCustomFieldValue<T>(order: Order, key: string): T | undefined {
        const customFields = (order.customFields || {}) as Record<string, unknown>;
        return customFields[key] as T | undefined;
    }

    private formatDate(value: Date | string | undefined): string | null {
        if (!value) {
            return null;
        }
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    private isPaidOrder(order: Order, transactionStatus?: string): boolean {
        if ((order.payments || []).some((payment) => PAID_PAYMENT_STATES.has(payment.state))) {
            return true;
        }
        return transactionStatus === 'approved';
    }

    private isOwnedByCustomer(order: Order, customerUserId?: string): boolean {
        if (!customerUserId) {
            return false;
        }

        if (!order.customer?.user?.id) {
            return false;
        }

        return String(order.customer.user.id) === String(customerUserId);
    }

    private validateFile(file: PersonalizationUploadInput['file']): void {
        if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
            throw new Error('Debes seleccionar un archivo.');
        }

        const mimeType = normalizeMimeType(file.mimetype);
        if (!this.config.allowedMimeTypes.includes(mimeType)) {
            throw new Error('El tipo de archivo no está permitido.');
        }

        if (file.size > this.config.maxFileSizeBytes) {
            throw new Error(`El archivo supera el máximo permitido de ${Math.round(this.config.maxFileSizeBytes / (1024 * 1024))} MB.`);
        }
    }
}
