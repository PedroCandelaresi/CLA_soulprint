import crypto from 'crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import {
    ChannelService,
    LanguageCode,
    Logger,
    Order,
    OrderService,
    Payment,
    PaymentMetadata,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';
import {
    MercadoPagoCreatePreferenceRequest,
    MercadoPagoCreatePreferenceResponse,
    MercadoPagoEnvironment,
    MercadoPagoPaymentMetadata,
    MercadoPagoPaymentResponse,
    MercadoPagoPreferenceItem,
    MercadoPagoPreferenceResult,
    MercadoPagoWebhookDecision,
    MercadoPagoWebhookPayload,
    MercadoPagoWebhookRequest,
} from './mercadopago.types';

const LOGGER_CONTEXT = 'MercadoPagoPlugin';
const MERCADOPAGO_API_BASE_URL = 'https://api.mercadopago.com';
const MERCADOPAGO_WEBHOOK_PATH = '/payments/mercadopago/webhook';
const EXTERNAL_REFERENCE_PATTERN = /^[A-Za-z0-9_-]+$/;

type NormalizedWebhookPayload = {
    paymentId?: string;
    topic?: string;
    action?: string;
};

type MercadoPagoSyncSource = 'webhook' | 'retry';

type TransactionAmountValidation = {
    expectedAmount: number;
    expectedAmountMinor: number;
    receivedAmount: number | null;
    receivedAmountMinor: number | null;
    matches: boolean;
};

type MercadoPagoSyncPlan = {
    decision: MercadoPagoWebhookDecision;
    targetState?: 'Settled' | 'Declined' | 'Cancelled';
    amountValidation: TransactionAmountValidation;
    status: string | null;
};

type MercadoPagoSyncResult = {
    decision: MercadoPagoWebhookDecision;
    order?: Order;
    payment?: Payment;
};

@Injectable()
export class MercadoPagoService {
    private readonly environment: MercadoPagoEnvironment;
    private readonly webhookSecret: string | null;

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
        private readonly channelService: ChannelService,
    ) {
        this.environment = this.resolveEnvironment();
        this.webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
    }

    async createPreference(
        order: Order,
        amount: number,
        input?: {
            retryCount?: number;
            retriedFromPaymentId?: string;
        },
    ): Promise<{
        preference: MercadoPagoCreatePreferenceResponse;
        paymentMetadata: MercadoPagoPaymentMetadata;
    }> {
        const externalReference = order.code;
        const retryCount = this.normalizeRetryCount(input?.retryCount);
        const backUrls = this.buildBackUrls(externalReference);
        const notificationUrl = this.buildNotificationUrl();
        const payload: MercadoPagoCreatePreferenceRequest = {
            items: this.buildPreferenceItems(order, amount),
            external_reference: externalReference,
            notification_url: notificationUrl,
            back_urls: backUrls,
            auto_return: 'approved',
            metadata: {
                vendureOrderCode: externalReference,
            },
        };
        const payer = this.buildPayer(order);

        if (payer) {
            payload.payer = payer;
        }

        const preference = await this.requestMercadoPago<MercadoPagoCreatePreferenceResponse>(
            '/checkout/preferences',
            {
                method: 'POST',
                headers: {
                    'X-Idempotency-Key': `vendure-pref-${externalReference}-r${retryCount}`,
                },
                body: JSON.stringify(payload),
            },
        );

        this.log('info', 'preference_created', {
            orderCode: externalReference,
            amount: this.toMercadoPagoAmount(amount),
            preferenceId: preference.id,
            notificationUrl,
            retryCount,
        });

        return {
            preference,
            paymentMetadata: this.buildInitialMetadata({
                preference,
                externalReference,
                backUrls,
                notificationUrl,
                retryCount,
                retriedFromPaymentId: input?.retriedFromPaymentId,
            }),
        };
    }

    async fetchPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
        return this.requestMercadoPago<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`, {
            method: 'GET',
        });
    }

    async handleWebhook(request: MercadoPagoWebhookRequest): Promise<void> {
        const normalized = this.normalizeWebhookPayload(request.body, request.query);

        this.log('info', 'webhook_received', {
            paymentId: normalized.paymentId ?? null,
            topic: normalized.topic ?? null,
            action: normalized.action ?? null,
            hasSignature: Boolean(request.signatureHeader),
            hasRequestId: Boolean(request.requestIdHeader),
        });

        if (!this.webhookSecret) {
            this.log('error', 'webhook_no_secret_configured', {});
            throw new ForbiddenException('Webhook secret not configured');
        }

        if (!normalized.paymentId) {
            this.log('warn', 'webhook_ignored_missing_payment_id', {
                topic: normalized.topic ?? null,
                action: normalized.action ?? null,
            });
            return;
        }

        if (!this.isPaymentNotification(normalized)) {
            this.log('info', 'webhook_ignored_unsupported_topic', {
                paymentId: normalized.paymentId,
                topic: normalized.topic ?? null,
                action: normalized.action ?? null,
            });
            return;
        }

        if (
            !this.isValidWebhookSignature({
                paymentId: normalized.paymentId,
                signatureHeader: request.signatureHeader,
                requestIdHeader: request.requestIdHeader,
            })
        ) {
            this.log('warn', 'webhook_invalid_signature', {
                paymentId: normalized.paymentId,
                requestId: request.requestIdHeader ?? null,
            });
            throw new ForbiddenException('Invalid Mercado Pago webhook signature');
        }

        const mercadoPagoPayment = await this.fetchPayment(normalized.paymentId);
        await this.syncVendurePayment(mercadoPagoPayment, {
            source: 'webhook',
            normalizedWebhook: normalized,
        });
    }

    async retryOrderPayment(
        ctx: RequestContext,
        order: Order,
        input?: {
            force?: boolean;
        },
    ): Promise<Order> {
        const force = input?.force === true;
        let currentOrder = order;
        let currentPayment = await this.getLatestMercadoPagoPaymentForOrder(ctx, currentOrder.id);

        if (!currentPayment) {
            throw new Error('No encontramos un intento previo de Mercado Pago para este pedido.');
        }

        let currentMetadata = this.parseMetadata(currentPayment.metadata);
        let remotePayment: MercadoPagoPaymentResponse | null = null;

        if (currentPayment.state === 'Authorized' && currentMetadata?.paymentId) {
            remotePayment = await this.fetchPayment(currentMetadata.paymentId);
            const syncResult = await this.syncVendurePayment(remotePayment, {
                ctx,
                source: 'retry',
            });

            currentOrder = syncResult.order ?? currentOrder;
            currentPayment = (await this.getLatestMercadoPagoPaymentForOrder(ctx, currentOrder.id)) ?? currentPayment;
            currentMetadata = this.parseMetadata(currentPayment.metadata);
        }

        if (currentPayment.state === 'Settled') {
            throw new Error('El pago ya quedó confirmado en Vendure. No hace falta reintentarlo.');
        }

        if (currentPayment.state === 'Authorized') {
            if (currentMetadata?.paymentId) {
                const refreshedRemotePayment =
                    remotePayment ?? (await this.fetchPayment(currentMetadata.paymentId));
                const normalizedRemoteStatus = this.normalizeMercadoPagoStatus(refreshedRemotePayment.status);

                if (
                    normalizedRemoteStatus === 'pending' ||
                    normalizedRemoteStatus === 'in_process' ||
                    normalizedRemoteStatus === 'authorized'
                ) {
                    throw new Error(
                        'Mercado Pago todavía informa este cobro como pendiente. Esperá la confirmación antes de generar otro intento.',
                    );
                }

                if (normalizedRemoteStatus === 'approved') {
                    await this.syncVendurePayment(refreshedRemotePayment, {
                        ctx,
                        source: 'retry',
                    });
                    throw new Error('Mercado Pago ya aprobó este pago. Reconsultá el estado real del pedido.');
                }
            } else if (!force) {
                throw new Error(
                    'Todavía existe un intento de pago abierto. Generá un nuevo intento solo si el link venció o quedó inválido.',
                );
            }

            const cancelResult = await this.orderService.cancelPayment(ctx, currentPayment.id);

            if (!this.isPaymentEntity(cancelResult)) {
                throw new Error(
                    this.getOrderServiceErrorMessage(
                        cancelResult,
                        'No pudimos invalidar el intento previo de Mercado Pago.',
                    ),
                );
            }

            this.log('warn', 'retry_cancelled_previous_payment', {
                orderCode: currentOrder.code,
                paymentId: String(currentPayment.id),
                force,
            });

            currentPayment = cancelResult;
            currentMetadata = this.parseMetadata(currentPayment.metadata);
        }

        if (
            currentPayment.state !== 'Declined' &&
            currentPayment.state !== 'Cancelled' &&
            currentPayment.state !== 'Error' &&
            currentPayment.state !== 'Created'
        ) {
            throw new Error('El último intento de pago todavía no quedó en un estado apto para reintentar.');
        }

        const orderForRetry = await this.orderService.findOne(ctx, currentOrder.id);

        if (!orderForRetry) {
            throw new Error(`No encontramos el pedido ${currentOrder.code} para generar un nuevo intento.`);
        }

        if (
            orderForRetry.state !== 'ArrangingAdditionalPayment' &&
            orderForRetry.state !== 'ArrangingPayment'
        ) {
            const transitionResult = await this.orderService.transitionToState(
                ctx,
                orderForRetry.id,
                'ArrangingAdditionalPayment',
            );

            if (!this.isOrderEntity(transitionResult)) {
                throw new Error(
                    this.getOrderServiceErrorMessage(
                        transitionResult,
                        'No pudimos preparar el pedido para un nuevo intento de pago.',
                    ),
                );
            }
        }

        const retryResult = await this.orderService.addPaymentToOrder(ctx, orderForRetry.id, {
            method: 'mercadopago',
            metadata: {
            source: 'mercadopago-retry',
            retryRequestedAt: new Date().toISOString(),
            retriedFromPaymentId: String(currentPayment.id),
            retryCount:
                typeof currentMetadata?.retryCount === 'number'
                    ? currentMetadata.retryCount + 1
                        : 1,
                forceRetry: force,
            },
        });

        if (!this.isOrderEntity(retryResult)) {
            throw new Error(
                this.getOrderServiceErrorMessage(
                    retryResult,
                    'No pudimos crear un nuevo intento de pago con Mercado Pago.',
                ),
            );
        }

        const nextPayment = this.getLatestMercadoPagoPayment(retryResult.payments ?? []);

        this.log('info', 'retry_payment_created', {
            orderCode: retryResult.code,
            previousPaymentId: String(currentPayment.id),
            nextPaymentId: nextPayment ? String(nextPayment.id) : null,
            force,
        });

        return retryResult;
    }

    getErrorMessage(error: unknown, fallbackMessage: string): string {
        if (error instanceof Error && error.message) {
            return error.message;
        }

        return fallbackMessage;
    }

    private async syncVendurePayment(
        mercadoPagoPayment: MercadoPagoPaymentResponse,
        options: {
            ctx?: RequestContext;
            source: MercadoPagoSyncSource;
            normalizedWebhook?: NormalizedWebhookPayload;
        },
    ): Promise<MercadoPagoSyncResult> {
        const externalReference = this.normalizeExternalReference(
            mercadoPagoPayment.external_reference,
        );

        if (!externalReference) {
            this.log('warn', 'webhook_invalid_external_reference', {
                source: options.source,
                paymentId: String(mercadoPagoPayment.id),
                externalReference: mercadoPagoPayment.external_reference ?? null,
            });
            return {
                decision: 'ignored_invalid_reference',
            };
        }

        const ctx = options.ctx ?? (await this.createAdminContext());

        return this.connection.withTransaction(ctx, async (txCtx) => {
            const order = await this.orderService.findOneByCode(txCtx, externalReference);

            if (!order) {
                this.log('error', 'webhook_order_not_found', {
                    source: options.source,
                    paymentId: String(mercadoPagoPayment.id),
                    externalReference,
                });
                return {
                    decision: 'ignored_order_not_found',
                };
            }

            const payments = await this.orderService.getOrderPayments(txCtx, order.id);
            const matchedPayment = this.findMatchingVendurePayment(payments, mercadoPagoPayment);

            if (!matchedPayment) {
                this.log('error', 'webhook_payment_not_matched', {
                    source: options.source,
                    paymentId: String(mercadoPagoPayment.id),
                    orderCode: order.code,
                    preferenceId: mercadoPagoPayment.preference_id?.trim() || null,
                });
                return {
                    decision: 'ignored_unmatched_payment',
                    order,
                };
            }

            const lockedPayment =
                (await this.loadPaymentForUpdate(txCtx, matchedPayment.id)) ?? matchedPayment;
            const syncPlan = this.planPaymentSync(order, lockedPayment, mercadoPagoPayment);
            const metadata = this.buildUpdatedMetadata(
                this.parseMetadata(lockedPayment.metadata),
                mercadoPagoPayment,
                {
                    externalReference,
                    decision: syncPlan.decision,
                    amountValidation: syncPlan.amountValidation,
                    normalizedWebhook: options.normalizedWebhook,
                },
            );
            const errorMessage = this.getWebhookErrorMessage(mercadoPagoPayment, syncPlan);

            await this.connection.getRepository(txCtx, Payment).update(lockedPayment.id, {
                metadata: metadata as PaymentMetadata,
                errorMessage: errorMessage ?? undefined,
            });

            let finalPayment = lockedPayment;

            if (syncPlan.targetState === 'Settled') {
                await this.orderService.settlePayment(txCtx, lockedPayment.id);
                finalPayment =
                    (await this.connection.getRepository(txCtx, Payment).findOne({
                        where: { id: lockedPayment.id },
                    })) ?? finalPayment;
            } else if (syncPlan.targetState === 'Declined') {
                await this.orderService.transitionPaymentToState(txCtx, lockedPayment.id, 'Declined');
                finalPayment =
                    (await this.connection.getRepository(txCtx, Payment).findOne({
                        where: { id: lockedPayment.id },
                    })) ?? finalPayment;
            } else if (syncPlan.targetState === 'Cancelled') {
                await this.orderService.cancelPayment(txCtx, lockedPayment.id);
                finalPayment =
                    (await this.connection.getRepository(txCtx, Payment).findOne({
                        where: { id: lockedPayment.id },
                    })) ?? finalPayment;
            }

            this.log(syncPlan.decision === 'amount_mismatch' ? 'error' : 'info', 'payment_sync_applied', {
                source: options.source,
                paymentId: String(mercadoPagoPayment.id),
                vendurePaymentId: String(finalPayment.id),
                orderCode: order.code,
                externalReference,
                mercadoPagoStatus: syncPlan.status,
                vendurePaymentState: finalPayment.state,
                decision: syncPlan.decision,
                expectedAmount: syncPlan.amountValidation.expectedAmount,
                receivedAmount: syncPlan.amountValidation.receivedAmount,
                amountMatches: syncPlan.amountValidation.matches,
            });

            return {
                decision: syncPlan.decision,
                order,
                payment: finalPayment,
            };
        });
    }

    private planPaymentSync(
        order: Order,
        payment: Payment,
        mercadoPagoPayment: MercadoPagoPaymentResponse,
    ): MercadoPagoSyncPlan {
        const status = this.normalizeMercadoPagoStatus(mercadoPagoPayment.status);
        const amountValidation = this.validateTransactionAmount(order, mercadoPagoPayment, status);

        if (!status) {
            return {
                decision: 'ignored_unknown_status',
                amountValidation,
                status: null,
            };
        }

        if (status === 'approved' && !amountValidation.matches) {
            return {
                decision: 'amount_mismatch',
                targetState: 'Declined',
                amountValidation,
                status,
            };
        }

        if (status === 'approved') {
            if (payment.state === 'Settled') {
                return {
                    decision: 'ignored_duplicate',
                    amountValidation,
                    status,
                };
            }

            if (payment.state === 'Declined' || payment.state === 'Cancelled') {
                return {
                    decision: 'ignored_terminal_conflict',
                    amountValidation,
                    status,
                };
            }

            return {
                decision: 'settled',
                targetState: 'Settled',
                amountValidation,
                status,
            };
        }

        if (status === 'pending' || status === 'in_process' || status === 'authorized') {
            if (payment.state === 'Settled') {
                return {
                    decision: 'ignored_duplicate',
                    amountValidation,
                    status,
                };
            }

            if (payment.state === 'Declined' || payment.state === 'Cancelled') {
                return {
                    decision: 'ignored_terminal_conflict',
                    amountValidation,
                    status,
                };
            }

            return {
                decision: 'kept_authorized_pending',
                amountValidation,
                status,
            };
        }

        if (status === 'rejected') {
            if (payment.state === 'Declined') {
                return {
                    decision: 'ignored_duplicate',
                    amountValidation,
                    status,
                };
            }

            if (payment.state === 'Settled') {
                return {
                    decision: 'ignored_terminal_conflict',
                    amountValidation,
                    status,
                };
            }

            return {
                decision: 'declined',
                targetState: 'Declined',
                amountValidation,
                status,
            };
        }

        if (status === 'cancelled') {
            if (payment.state === 'Cancelled') {
                return {
                    decision: 'ignored_duplicate',
                    amountValidation,
                    status,
                };
            }

            if (payment.state === 'Settled') {
                return {
                    decision: 'ignored_terminal_conflict',
                    amountValidation,
                    status,
                };
            }

            return {
                decision: 'cancelled',
                targetState: 'Cancelled',
                amountValidation,
                status,
            };
        }

        return {
            decision: 'ignored_unknown_status',
            amountValidation,
            status,
        };
    }

    private validateTransactionAmount(
        order: Order,
        mercadoPagoPayment: MercadoPagoPaymentResponse,
        status: string | null,
    ): TransactionAmountValidation {
        const expectedAmountMinor = order.totalWithTax;
        const expectedAmount = this.toMercadoPagoAmount(expectedAmountMinor);
        const receivedAmount =
            typeof mercadoPagoPayment.transaction_amount === 'number'
                ? mercadoPagoPayment.transaction_amount
                : null;
        const receivedAmountMinor =
            receivedAmount != null ? this.toMinorUnits(receivedAmount) : null;
        const shouldValidateAmount =
            status === 'approved' ||
            status === 'pending' ||
            status === 'in_process' ||
            status === 'authorized';

        return {
            expectedAmount,
            expectedAmountMinor,
            receivedAmount,
            receivedAmountMinor,
            matches: !shouldValidateAmount
                ? true
                : receivedAmountMinor != null && receivedAmountMinor === expectedAmountMinor,
        };
    }

    private getWebhookErrorMessage(
        mercadoPagoPayment: MercadoPagoPaymentResponse,
        syncPlan: MercadoPagoSyncPlan,
    ): string | null {
        if (syncPlan.decision === 'amount_mismatch') {
            return [
                'Mercado Pago informó un monto distinto al esperado.',
                `Esperado: ${syncPlan.amountValidation.expectedAmount.toFixed(2)}.`,
                `Recibido: ${
                    syncPlan.amountValidation.receivedAmount != null
                        ? syncPlan.amountValidation.receivedAmount.toFixed(2)
                        : 'sin monto'
                }.`,
            ].join(' ');
        }

        const normalizedStatus = syncPlan.status;

        if (normalizedStatus === 'rejected' || normalizedStatus === 'cancelled') {
            return (
                mercadoPagoPayment.status_detail ||
                `Mercado Pago status: ${mercadoPagoPayment.status}`
            );
        }

        return null;
    }

    private async getLatestMercadoPagoPaymentForOrder(
        ctx: RequestContext,
        orderId: Order['id'],
    ): Promise<Payment | undefined> {
        const payments = await this.orderService.getOrderPayments(ctx, orderId);
        return this.getLatestMercadoPagoPayment(payments);
    }

    private getLatestMercadoPagoPayment(payments: Payment[]): Payment | undefined {
        return [...payments]
            .filter((payment) => {
                const metadata = this.parseMetadata(payment.metadata);
                return payment.method === 'mercadopago' || metadata?.provider === 'mercadopago';
            })
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    }

    private async loadPaymentForUpdate(
        ctx: RequestContext,
        paymentId: Payment['id'],
    ): Promise<Payment | null> {
        return (
            (await this.connection
                .getRepository(ctx, Payment)
                .createQueryBuilder('payment')
                .setLock('pessimistic_write')
                .where('payment.id = :paymentId', { paymentId })
                .getOne()) ?? null
        );
    }

    private buildUpdatedMetadata(
        existingMetadata: MercadoPagoPaymentMetadata | null,
        mercadoPagoPayment: MercadoPagoPaymentResponse,
        input: {
            externalReference: string;
            decision: MercadoPagoWebhookDecision;
            amountValidation: TransactionAmountValidation;
            normalizedWebhook?: NormalizedWebhookPayload;
        },
    ): MercadoPagoPaymentMetadata {
        const now = new Date().toISOString();
        const publicMetadata = existingMetadata?.public ?? {
            environment: this.environment,
            externalReference: input.externalReference,
        };

        return {
            ...(existingMetadata ?? {}),
            provider: 'mercadopago',
            environment: existingMetadata?.environment || this.environment,
            externalReference: input.externalReference,
            preferenceId:
                mercadoPagoPayment.preference_id?.trim() || existingMetadata?.preferenceId,
            initPoint: existingMetadata?.initPoint,
            sandboxInitPoint: existingMetadata?.sandboxInitPoint,
            paymentId: String(mercadoPagoPayment.id),
            merchantOrderId:
                mercadoPagoPayment.order?.id != null
                    ? String(mercadoPagoPayment.order.id)
                    : existingMetadata?.merchantOrderId ?? null,
            status: mercadoPagoPayment.status,
            statusDetail: mercadoPagoPayment.status_detail || undefined,
            paymentMethodId: mercadoPagoPayment.payment_method_id || undefined,
            paymentTypeId: mercadoPagoPayment.payment_type_id || undefined,
            notificationUrl: existingMetadata?.notificationUrl,
            backUrls: existingMetadata?.backUrls,
            preferenceCreatedAt: existingMetadata?.preferenceCreatedAt ?? null,
            expectedAmount: input.amountValidation.expectedAmount,
            expectedAmountMinor: input.amountValidation.expectedAmountMinor,
            receivedAmount: input.amountValidation.receivedAmount,
            receivedAmountMinor: input.amountValidation.receivedAmountMinor,
            amountMatches: input.amountValidation.matches,
            lastValidatedAt: now,
            lastWebhookAt: now,
            lastWebhookTopic: input.normalizedWebhook?.topic ?? null,
            lastWebhookAction: input.normalizedWebhook?.action ?? null,
            lastDecision: input.decision,
            retryCount:
                typeof existingMetadata?.retryCount === 'number'
                    ? existingMetadata.retryCount
                    : 0,
            retriedFromPaymentId:
                typeof existingMetadata?.retriedFromPaymentId === 'string'
                    ? existingMetadata.retriedFromPaymentId
                    : null,
            public: {
                ...publicMetadata,
                environment: publicMetadata.environment || this.environment,
                externalReference: input.externalReference,
                preferenceId:
                    mercadoPagoPayment.preference_id?.trim() ||
                    publicMetadata.preferenceId,
                initPoint:
                    existingMetadata?.initPoint ||
                    publicMetadata.initPoint ||
                    null,
                sandboxInitPoint:
                    existingMetadata?.sandboxInitPoint ||
                    publicMetadata.sandboxInitPoint ||
                    null,
                paymentId: String(mercadoPagoPayment.id),
                status: mercadoPagoPayment.status,
                statusDetail: mercadoPagoPayment.status_detail || undefined,
                preferenceCreatedAt:
                    publicMetadata.preferenceCreatedAt ??
                    existingMetadata?.preferenceCreatedAt ??
                    null,
                lastValidatedAt: now,
                lastDecision: input.decision,
                amountMatches: input.amountValidation.matches,
            },
        };
    }

    private findMatchingVendurePayment(
        payments: Payment[],
        mercadoPagoPayment: MercadoPagoPaymentResponse,
    ): Payment | undefined {
        const mpPaymentId = String(mercadoPagoPayment.id);
        const mpPreferenceId = mercadoPagoPayment.preference_id?.trim();
        const mpExternalReference = this.normalizeExternalReference(
            mercadoPagoPayment.external_reference,
        );
        const mercadopagoPayments = [...payments]
            .filter((payment) => {
                const metadata = this.parseMetadata(payment.metadata);
                return payment.method === 'mercadopago' || metadata?.provider === 'mercadopago';
            })
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

        const byPaymentId = mercadopagoPayments.find((payment) => {
            const metadata = this.parseMetadata(payment.metadata);
            return metadata?.paymentId === mpPaymentId;
        });

        if (byPaymentId) {
            return byPaymentId;
        }

        if (mpPreferenceId) {
            const byPreferenceId = mercadopagoPayments.find((payment) => {
                const metadata = this.parseMetadata(payment.metadata);
                return metadata?.preferenceId === mpPreferenceId;
            });

            if (byPreferenceId) {
                return byPreferenceId;
            }
        }

        if (!mpExternalReference) {
            return undefined;
        }

        const byExternalReference = mercadopagoPayments.filter((payment) => {
            const metadata = this.parseMetadata(payment.metadata);
            return metadata?.externalReference === mpExternalReference;
        });

        return byExternalReference.length === 1 ? byExternalReference[0] : undefined;
    }

    private parseMetadata(metadata: unknown): MercadoPagoPaymentMetadata | null {
        if (!metadata || typeof metadata !== 'object') {
            return null;
        }

        const candidate = metadata as Partial<MercadoPagoPaymentMetadata>;

        if (candidate.provider !== 'mercadopago') {
            return null;
        }

        if (!candidate.public || typeof candidate.public !== 'object') {
            return null;
        }

        return candidate as MercadoPagoPaymentMetadata;
    }

    private normalizeWebhookPayload(
        body: MercadoPagoWebhookPayload,
        query: Record<string, unknown>,
    ): NormalizedWebhookPayload {
        const topic =
            this.getSingleValue(query.type) ||
            this.getSingleValue(query.topic) ||
            body.type ||
            body.topic;
        const action = body.action;
        const paymentId =
            this.normalizeStringId(body.data?.id) ||
            this.getNestedQueryDataId(query) ||
            this.getSingleValue(query.id);

        return {
            paymentId,
            topic,
            action,
        };
    }

    private isPaymentNotification(payload: NormalizedWebhookPayload): boolean {
        const topic = payload.topic?.toLowerCase();
        const action = payload.action?.toLowerCase();

        return topic === 'payment' || action?.startsWith('payment.') === true;
    }

    private isValidWebhookSignature(input: {
        paymentId: string;
        signatureHeader?: string;
        requestIdHeader?: string;
    }): boolean {
        const secret = this.webhookSecret;

        if (!secret) {
            return false;
        }

        if (!input.signatureHeader || !input.requestIdHeader) {
            return false;
        }

        const signatureParts = input.signatureHeader
            .split(',')
            .map((part) => part.trim())
            .reduce<Record<string, string>>((accumulator, part) => {
                const [rawKey, rawValue] = part.split('=');
                const key = rawKey?.trim();
                const value = rawValue?.trim();

                if (key && value) {
                    accumulator[key] = value;
                }

                return accumulator;
            }, {});

        const timestamp = signatureParts.ts;
        const receivedSignature = signatureParts.v1?.toLowerCase();

        if (!timestamp || !receivedSignature) {
            return false;
        }

        const tsMs = Number(timestamp) * 1000;
        const ageSecs = Math.abs(Date.now() - tsMs) / 1000;

        if (!Number.isFinite(tsMs) || ageSecs > 300) {
            return false;
        }

        const manifest = [
            `id:${input.paymentId.toLowerCase()};`,
            `request-id:${input.requestIdHeader};`,
            `ts:${timestamp};`,
        ].join('');

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(manifest)
            .digest('hex')
            .toLowerCase();

        if (generatedSignature.length !== receivedSignature.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(generatedSignature),
            Buffer.from(receivedSignature),
        );
    }

    private buildInitialMetadata(input: {
        preference: MercadoPagoCreatePreferenceResponse;
        externalReference: string;
        backUrls: Record<MercadoPagoPreferenceResult, string>;
        notificationUrl: string;
        retryCount?: number;
        retriedFromPaymentId?: string;
    }): MercadoPagoPaymentMetadata {
        const environment = this.environment;
        const preferenceCreatedAt = new Date().toISOString();
        const retryCount = this.normalizeRetryCount(input.retryCount);

        return {
            provider: 'mercadopago',
            environment,
            externalReference: input.externalReference,
            preferenceId: input.preference.id,
            initPoint: input.preference.init_point || null,
            sandboxInitPoint: input.preference.sandbox_init_point || null,
            notificationUrl: input.notificationUrl,
            backUrls: input.backUrls,
            preferenceCreatedAt,
            retryCount,
            retriedFromPaymentId: input.retriedFromPaymentId ?? null,
            public: {
                environment,
                externalReference: input.externalReference,
                preferenceId: input.preference.id,
                initPoint: input.preference.init_point || null,
                sandboxInitPoint: input.preference.sandbox_init_point || null,
                preferenceCreatedAt,
            },
        };
    }

    private buildPreferenceItems(order: Order, amount: number): MercadoPagoPreferenceItem[] {
        const orderLines = Array.isArray(order.lines) ? order.lines : [];
        const items: MercadoPagoPreferenceItem[] = [];
        let computedAmount = 0;

        for (const line of orderLines) {
            if (line.quantity <= 0) {
                continue;
            }

            computedAmount += line.unitPriceWithTax * line.quantity;

            items.push({
                id: line.productVariant?.sku || String(line.id),
                title: line.productVariant?.name || `Item ${line.id}`,
                description: `Pedido ${order.code}`,
                quantity: line.quantity,
                currency_id: order.currencyCode,
                unit_price: this.toMercadoPagoAmount(line.unitPriceWithTax),
            });
        }

        if (order.shippingWithTax > 0) {
            computedAmount += order.shippingWithTax;
            items.push({
                id: `shipping-${order.code}`,
                title: 'Envío',
                description: `Costo de envío del pedido ${order.code}`,
                quantity: 1,
                currency_id: order.currencyCode,
                unit_price: this.toMercadoPagoAmount(order.shippingWithTax),
            });
        }

        if (items.length === 0 || computedAmount !== amount) {
            return [
                {
                    id: order.code,
                    title: `Pedido ${order.code}`,
                    description: 'Checkout Pro Mercado Pago',
                    quantity: 1,
                    currency_id: order.currencyCode,
                    unit_price: this.toMercadoPagoAmount(amount),
                },
            ];
        }

        return items;
    }

    private buildPayer(order: Order):
        | {
              email?: string;
              name?: string;
              surname?: string;
          }
        | undefined {
        const email = order.customer?.emailAddress?.trim() || undefined;
        const fullName = order.shippingAddress?.fullName?.trim();

        if (!email && !fullName) {
            return undefined;
        }

        const nameParts = fullName?.split(/\s+/).filter(Boolean) ?? [];
        const [name, ...surnameParts] = nameParts;

        return {
            email,
            name: name || undefined,
            surname: surnameParts.join(' ') || undefined,
        };
    }

    private buildBackUrls(
        externalReference: string,
    ): Record<MercadoPagoPreferenceResult, string> {
        return {
            success: this.buildReturnUrl('success', externalReference),
            failure: this.buildReturnUrl('failure', externalReference),
            pending: this.buildReturnUrl('pending', externalReference),
        };
    }

    private buildReturnUrl(result: MercadoPagoPreferenceResult, externalReference: string): string {
        const url = new URL('/checkout/retorno', this.getPublicBaseUrl());
        url.searchParams.set('result', result);
        url.searchParams.set('external_reference', externalReference);
        return url.toString();
    }

    private buildNotificationUrl(): string {
        const url = new URL(MERCADOPAGO_WEBHOOK_PATH, this.getPublicBaseUrl());
        url.searchParams.set('source_news', 'webhooks');
        return url.toString();
    }

    private resolveEnvironment(): MercadoPagoEnvironment {
        const rawValue = process.env.MERCADOPAGO_ENV?.trim().toLowerCase();

        if (!rawValue) {
            return 'testing';
        }

        if (rawValue === 'testing' || rawValue === 'production') {
            return rawValue;
        }

        throw new Error('MERCADOPAGO_ENV must be "testing" or "production".');
    }

    private getPublicBaseUrl(): string {
        const rawValue =
            process.env.MERCADOPAGO_PUBLIC_BASE_URL?.trim() ||
            process.env.SHOP_PUBLIC_URL?.trim();

        if (!rawValue) {
            throw new Error('Missing MERCADOPAGO_PUBLIC_BASE_URL or SHOP_PUBLIC_URL');
        }

        return rawValue.endsWith('/') ? rawValue : `${rawValue}/`;
    }

    private getAccessToken(): string {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

        if (!accessToken) {
            throw new Error('Missing MERCADOPAGO_ACCESS_TOKEN');
        }

        return accessToken;
    }

    private async createAdminContext(): Promise<RequestContext> {
        const channel = await this.channelService.getDefaultChannel();

        return this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: channel.token,
            languageCode: LanguageCode.es,
        });
    }

    private async requestMercadoPago<T>(path: string, init: RequestInit): Promise<T> {
        const response = await fetch(`${MERCADOPAGO_API_BASE_URL}${path}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${this.getAccessToken()}`,
                'Content-Type': 'application/json',
                ...(init.headers ?? {}),
            },
        });

        const rawResponse = await response.text();
        const payload = rawResponse ? this.parseJsonRecord(rawResponse) : {};

        if (!response.ok) {
            const errorMessage = this.extractMercadoPagoError(payload, response.statusText);
            throw new Error(errorMessage);
        }

        return payload as T;
    }

    private extractMercadoPagoError(
        payload: Record<string, unknown>,
        fallbackMessage: string,
    ): string {
        if (typeof payload.message === 'string' && payload.message.trim()) {
            return payload.message;
        }

        if (typeof payload.error === 'string' && payload.error.trim()) {
            return payload.error;
        }

        if (Array.isArray(payload.cause)) {
            const causeMessage = payload.cause
                .map((item) => {
                    if (typeof item === 'string') {
                        return item;
                    }

                    if (
                        item &&
                        typeof item === 'object' &&
                        typeof (item as { description?: unknown }).description === 'string'
                    ) {
                        return (item as { description: string }).description;
                    }

                    return null;
                })
                .filter((item): item is string => Boolean(item))
                .join('; ');

            if (causeMessage) {
                return causeMessage;
            }
        }

        return fallbackMessage || 'Mercado Pago request failed';
    }

    private getSingleValue(value: unknown): string | undefined {
        if (Array.isArray(value)) {
            return typeof value[0] === 'string' ? value[0] : undefined;
        }

        return typeof value === 'string' ? value : undefined;
    }

    private parseJsonRecord(rawValue: string): Record<string, unknown> {
        try {
            return JSON.parse(rawValue) as Record<string, unknown>;
        } catch {
            throw new Error('Mercado Pago returned a non-JSON response');
        }
    }

    private normalizeStringId(value: number | string | undefined): string | undefined {
        if (value == null) {
            return undefined;
        }

        return String(value);
    }

    private getNestedQueryDataId(query: Record<string, unknown>): string | undefined {
        const data = query.data;

        if (!data || typeof data !== 'object') {
            return undefined;
        }

        return this.normalizeStringId(
            (data as { id?: number | string | undefined }).id,
        );
    }

    private normalizeExternalReference(value: string | null | undefined): string | null {
        const normalizedValue = value?.trim() || null;

        if (!normalizedValue || !EXTERNAL_REFERENCE_PATTERN.test(normalizedValue)) {
            return null;
        }

        return normalizedValue;
    }

    private normalizeMercadoPagoStatus(value: string | null | undefined): string | null {
        const normalizedValue = value?.trim().toLowerCase() || null;
        return normalizedValue || null;
    }

    private normalizeRetryCount(value: unknown): number {
        return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
    }

    private isOrderEntity(value: unknown): value is Order {
        return typeof value === 'object' && value !== null && 'id' in value && 'code' in value;
    }

    private isPaymentEntity(value: unknown): value is Payment {
        return typeof value === 'object' && value !== null && 'id' in value && 'state' in value;
    }

    private getOrderServiceErrorMessage(value: unknown, fallbackMessage: string): string {
        if (!value || typeof value !== 'object') {
            return fallbackMessage;
        }

        if (typeof (value as { message?: unknown }).message === 'string') {
            return (value as { message: string }).message;
        }

        if (typeof (value as { paymentErrorMessage?: unknown }).paymentErrorMessage === 'string') {
            return (value as { paymentErrorMessage: string }).paymentErrorMessage;
        }

        if (typeof (value as { transitionError?: unknown }).transitionError === 'string') {
            return (value as { transitionError: string }).transitionError;
        }

        if (
            typeof (value as { eligibilityCheckerMessage?: unknown }).eligibilityCheckerMessage ===
            'string'
        ) {
            return (value as { eligibilityCheckerMessage: string }).eligibilityCheckerMessage;
        }

        return fallbackMessage;
    }

    private log(
        level: 'info' | 'warn' | 'error',
        event: string,
        payload: Record<string, unknown>,
    ): void {
        const message = JSON.stringify({
            provider: 'mercadopago',
            event,
            environment: this.environment,
            ...payload,
        });

        if (level === 'error') {
            Logger.error(message, LOGGER_CONTEXT);
            return;
        }

        if (level === 'warn') {
            Logger.warn(message, LOGGER_CONTEXT);
            return;
        }

        Logger.info(message, LOGGER_CONTEXT);
    }

    private toMercadoPagoAmount(amount: number): number {
        return Number((amount / 100).toFixed(2));
    }

    private toMinorUnits(amount: number): number {
        return Math.round(amount * 100);
    }
}
