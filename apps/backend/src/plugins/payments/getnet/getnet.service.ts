import { randomUUID } from 'node:crypto';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DataSource } from 'typeorm';
import {
    GetnetPluginConfig,
    GetnetOAuthConfig,
    GetnetOAuthTokenResponse,
    GetnetOrderRequest,
    GetnetOrderResponse,
    CreateCheckoutDto,
    CheckoutResponse,
    OrderStatusResponse,
    GetnetWebhookPayload,
    GetnetMockForceStatus,
} from './getnet.types';
import {
    GetnetPaymentTransaction,
    GetnetPaymentStatus,
    mapGetnetStatus,
    isTerminalStatus,
} from './getnet-transaction.entity';
import { GetnetTransactionRepository } from './getnet-transaction.repository';
import { AndreaniShipmentService } from '../../logistics/andreani/andreani-shipment.service';
import type { PersonalizationService } from '../../logistics/personalization/personalization.service';
import type { Order } from '@vendure/core';

const GETNET_LOG_PREFIX = '[getnet]';

type GetnetStoredMetadata = {
    itemCount?: number;
    createdFrom?: string;
    redirectUrls?: {
        success: string;
        failed: string;
    };
    mock?: {
        enabled: boolean;
        forceStatus: GetnetMockForceStatus;
    };
};

/**
 * GetnetService handles all communication with the Getnet Checkout API.
 * 
 * Key responsibilities:
 * - OAuth token management with automatic refresh
 * - Order creation and status queries
 * - Webhook processing with idempotency
 * - Persistence of transaction state via GetnetTransactionRepository
 */
export class GetnetService {
    private readonly prefix = GETNET_LOG_PREFIX;
    private httpClient: AxiosInstance;
    private oauthConfig: GetnetOAuthConfig;
    private pluginConfig: GetnetPluginConfig;
    private transactionRepo: GetnetTransactionRepository;
    private andreaniShipmentService: AndreaniShipmentService | null = null;
    private personalizationService: PersonalizationService | null = null;
    
    // Token cache
    private cachedToken: string | null = null;
    private tokenExpiresAt: number = 0;
    
    // Buffer time (seconds) before actual expiration to refresh token
    private static readonly TOKEN_REFRESH_BUFFER = 60;

    constructor(config: GetnetPluginConfig, dataSource: DataSource) {
        this.pluginConfig = config;
        this.oauthConfig = {
            baseUrl: config.authBaseUrl,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            scope: config.scope,
        };
        
        this.httpClient = axios.create({
            baseURL: config.checkoutBaseUrl,
            timeout: config.requestTimeout || 30000,
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
            },
        });
        
        // Initialize the transaction repository
        this.transactionRepo = new GetnetTransactionRepository(dataSource);
        
        console.log(`${this.prefix} Service initialized`);
        console.log(`${this.prefix} Auth URL: ${config.authBaseUrl}`);
        console.log(`${this.prefix} Checkout URL: ${config.checkoutBaseUrl}`);
        console.log(`${this.prefix} Mode: ${this.getMode()}`);
    }

    public isMockModeEnabled(): boolean {
        return this.getMode() === 'mock';
    }

    private getMode(): 'real' | 'mock' {
        return this.pluginConfig.mode === 'mock' ? 'mock' : 'real';
    }

    private getMockForceStatus(): GetnetMockForceStatus {
        const value = (this.pluginConfig.mockForceStatus || 'interactive').toLowerCase().trim();
        const allowed: GetnetMockForceStatus[] = [
            'interactive',
            'pending',
            'processing',
            'approved',
            'rejected',
            'cancelled',
            'expired',
        ];

        return allowed.includes(value as GetnetMockForceStatus)
            ? (value as GetnetMockForceStatus)
            : 'interactive';
    }

    private resolveRedirectUrls(dto?: CreateCheckoutDto, metadata?: GetnetStoredMetadata): { success: string; failed: string } {
        const success = dto?.successUrl
            || metadata?.redirectUrls?.success
            || this.pluginConfig.successUrl
            || 'http://localhost:3000/checkout/success';
        const failed = dto?.failedUrl
            || metadata?.redirectUrls?.failed
            || this.pluginConfig.failedUrl
            || 'http://localhost:3000/checkout/failed';

        return { success, failed };
    }

    private buildStoredMetadata(dto: CreateCheckoutDto, extra?: Partial<GetnetStoredMetadata>): string {
        const metadata: GetnetStoredMetadata = {
            itemCount: dto.items.length,
            createdFrom: 'createOrder',
            redirectUrls: this.resolveRedirectUrls(dto),
            ...extra,
        };

        return JSON.stringify(metadata);
    }

    private parseStoredMetadata(transaction: GetnetPaymentTransaction): GetnetStoredMetadata {
        if (!transaction.metadata) {
            return {};
        }

        try {
            return JSON.parse(transaction.metadata) as GetnetStoredMetadata;
        } catch (error) {
            console.warn(`${this.prefix} Could not parse transaction metadata for ${transaction.id}:`, error);
            return {};
        }
    }

    private buildMockCheckoutUrl(_dto: CreateCheckoutDto, orderUuid: string): string {
        const url = new URL(
            `/payments/getnet/mock/checkout/${encodeURIComponent(orderUuid)}`,
            'http://mock.local',
        );
        const forcedStatus = this.getMockForceStatus();
        if (forcedStatus !== 'interactive') {
            url.searchParams.set('status', forcedStatus);
        }
        const processUrl = `${url.pathname}${url.search}`;
        console.log(`${this.prefix} [mock] Using public standalone processUrl: ${processUrl}`);
        return processUrl;
    }

    private shouldRedirectToSuccess(status: GetnetPaymentStatus): boolean {
        return status === 'approved' || status === 'pending' || status === 'processing';
    }

    private sanitizeMockStatus(rawStatus?: string | null): GetnetPaymentStatus | null {
        if (!rawStatus) {
            return null;
        }

        const normalized = rawStatus.toLowerCase().trim();
        const allowed: GetnetPaymentStatus[] = [
            'pending',
            'processing',
            'approved',
            'rejected',
            'cancelled',
            'expired',
        ];

        return allowed.includes(normalized as GetnetPaymentStatus)
            ? (normalized as GetnetPaymentStatus)
            : null;
    }

    private buildMockWebhookPayload(orderUuid: string, status: GetnetPaymentStatus): GetnetWebhookPayload {
        return {
            event: `mock.${status}`,
            timestamp: new Date().toISOString(),
            orderId: orderUuid,
            orderUuid,
            status,
            metadata: {
                source: 'getnet-mock',
                mode: 'mock',
            },
        };
    }

    private async createMockOrder(dto: CreateCheckoutDto): Promise<CheckoutResponse> {
        console.log(`${this.prefix} [mock] Creating mock checkout for order ${dto.orderCode}`);

        const totalAmount = dto.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const shippingCost = dto.shippingCost || 0;
        const finalAmount = totalAmount + shippingCost;
        const providerOrderUuid = `mock-${randomUUID()}`;
        const checkoutUrl = this.buildMockCheckoutUrl(dto, providerOrderUuid);
        const expiresAt = this.pluginConfig.expireLimitMinutes
            ? new Date(Date.now() + this.pluginConfig.expireLimitMinutes * 60_000)
            : undefined;

        const transaction = await this.transactionRepo.create({
            vendureOrderCode: dto.orderCode,
            providerOrderUuid,
            checkoutUrl,
            amount: finalAmount,
            currency: this.pluginConfig.currency,
            expiresAt,
            metadata: this.buildStoredMetadata(dto, {
                mock: {
                    enabled: true,
                    forceStatus: this.getMockForceStatus(),
                },
            }),
        });

        await this.transactionRepo.updateCheckoutUrl(transaction.id, checkoutUrl, expiresAt);

        return {
            mode: 'mock',
            status: 'pending',
            checkoutId: providerOrderUuid,
            transactionId: transaction.id,
            orderUuid: providerOrderUuid,
            processUrl: checkoutUrl,
            checkoutUrl,
            vendureOrderCode: dto.orderCode,
            expiresAt: expiresAt?.toISOString(),
            raw: {
                mode: 'mock',
                forceStatus: this.getMockForceStatus(),
            },
            rawResponse: {
                status: 'pending',
                createdAt: transaction.createdAt.toISOString(),
            },
        };
    }

    private async getMockOrderStatus(orderUuid: string): Promise<OrderStatusResponse> {
        const transaction = await this.transactionRepo.findByProviderOrderUuid(orderUuid);

        if (!transaction) {
            throw new Error(`Order not found: ${orderUuid}`);
        }

        return {
            transactionId: transaction.id,
            orderUuid: transaction.providerOrderUuid,
            vendureOrderCode: transaction.vendureOrderCode,
            status: transaction.status,
            providerStatus: transaction.lastEvent,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
            expiresAt: transaction.expiresAt?.toISOString(),
            approvedAt: transaction.approvedAt?.toISOString(),
            isTerminal: transaction.isTerminal,
            webhookEventCount: transaction.webhookEventCount,
        };
    }

    public async getMockCheckoutContext(orderUuid: string): Promise<{
        transaction: GetnetPaymentTransaction;
        redirectUrls: { success: string; failed: string };
        forceStatus: GetnetMockForceStatus;
    }> {
        const transaction = await this.transactionRepo.findByProviderOrderUuid(orderUuid);
        if (!transaction) {
            throw new Error(`Order not found: ${orderUuid}`);
        }

        const metadata = this.parseStoredMetadata(transaction);
        return {
            transaction,
            redirectUrls: this.resolveRedirectUrls(undefined, metadata),
            forceStatus: metadata.mock?.forceStatus || this.getMockForceStatus(),
        };
    }

    public async completeMockCheckout(orderUuid: string, rawStatus?: string | null): Promise<{
        transaction: GetnetPaymentTransaction;
        redirectUrl: string;
        finalStatus: GetnetPaymentStatus;
    }> {
        if (!this.isMockModeEnabled()) {
            throw new Error('Mock checkout is disabled');
        }

        const { transaction, redirectUrls, forceStatus } = await this.getMockCheckoutContext(orderUuid);
        const selectedStatus = this.sanitizeMockStatus(rawStatus || undefined)
            || (forceStatus !== 'interactive' ? this.sanitizeMockStatus(forceStatus) : null)
            || 'approved';

        const webhookResult = await this.processWebhook(
            this.buildMockWebhookPayload(orderUuid, selectedStatus),
        );

        if (!webhookResult.success && !webhookResult.isIdempotent) {
            throw new Error(webhookResult.message);
        }

        const updatedTransaction = await this.transactionRepo.findByProviderOrderUuid(orderUuid) || transaction;
        const redirectBase = this.shouldRedirectToSuccess(updatedTransaction.status)
            ? redirectUrls.success
            : redirectUrls.failed;
        const redirectUrl = new URL(redirectBase);
        redirectUrl.searchParams.set('mock', '1');
        redirectUrl.searchParams.set('mock_status', updatedTransaction.status);
        redirectUrl.searchParams.set('order_uuid', updatedTransaction.providerOrderUuid);
        redirectUrl.searchParams.set('transaction_id', updatedTransaction.id);

        return {
            transaction: updatedTransaction,
            redirectUrl: redirectUrl.toString(),
            finalStatus: updatedTransaction.status,
        };
    }

    /**
     * Get or refresh OAuth token
     * Uses cached token if still valid (with buffer time)
     */
    async getAccessToken(): Promise<string> {
        if (this.isMockModeEnabled()) {
            throw new Error('OAuth token is not used in GETNET_MODE=mock');
        }

        const now = Date.now();
        const bufferMs = GetnetService.TOKEN_REFRESH_BUFFER * 1000;
        
        // Return cached token if still valid (with buffer)
        if (this.cachedToken && this.tokenExpiresAt > now + bufferMs) {
            console.debug(`${this.prefix} Using cached OAuth token`);
            return this.cachedToken;
        }
        
        // Need to refresh token
        console.log(`${this.prefix} Refreshing OAuth token...`);
        
        // Build OAuth URL and log for debugging
        const oauthUrl = `${this.oauthConfig.baseUrl}/oauth/token`;
        console.log(`${this.prefix} OAuth Request Details:`);
        console.log(`${this.prefix}   URL: ${oauthUrl}`);
        console.log(`${this.prefix}   Method: POST`);
        console.log(`${this.prefix}   authBaseUrl: ${this.oauthConfig.baseUrl}`);
        console.log(`${this.prefix}   clientId: ${this.oauthConfig.clientId.substring(0, 10)}...`);
        console.log(`${this.prefix}   scope: ${this.oauthConfig.scope}`);
        
        try {
            const response = await axios.post<GetnetOAuthTokenResponse>(
                oauthUrl,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.oauthConfig.clientId,
                    client_secret: this.oauthConfig.clientSecret,
                    scope: this.oauthConfig.scope,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                    },
                    timeout: this.pluginConfig.requestTimeout || 30000,
                }
            );
            
            this.cachedToken = response.data.access_token;
            // Convert expires_in (seconds) to absolute timestamp
            this.tokenExpiresAt = now + response.data.expires_in * 1000;
            
            // Log token info safely (only first 20 chars + mask)
            const safeToken = this.cachedToken ?? '';
            const maskedToken = safeToken.substring(0, 20) + '...' + safeToken.substring(safeToken.length - 5);
            console.log(`${this.prefix} OAuth token obtained, expires in ${response.data.expires_in}s`);
            console.debug(`${this.prefix} Token prefix: ${maskedToken}`);
            
            if (this.cachedToken) {
                return this.cachedToken;
            }
            throw new Error('Token is null after successful response');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`${this.prefix} Failed to obtain OAuth token: ${errorMessage}`);
            
            // Log detailed error info for debugging
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown; headers?: unknown } };
                console.error(`${this.prefix} OAuth Response Status: ${axiosError.response?.status}`);
                console.error(`${this.prefix} OAuth Response StatusText: ${axiosError.response?.statusText}`);
                console.error(`${this.prefix} OAuth Response Data:`, axiosError.response?.data);
                console.error(`${this.prefix} OAuth Response Headers:`, axiosError.response?.headers);
            }
            
            throw new Error('Getnet authentication failed');
        }
    }

    /**
     * Validate that the amount in the DTO matches Vendure's authoritative order total.
     * Prevents clients from manipulating prices by sending lower amounts.
     */
    private async validateAmountAgainstVendure(dto: CreateCheckoutDto): Promise<void> {
        const orderService = (this as any).orderService;
        const requestContextService = (this as any).requestContextService;

        if (!orderService || !requestContextService) {
            console.warn(`${this.prefix} Amount validation skipped: Vendure services not injected`);
            return;
        }

        const ctx = await requestContextService.create({ apiType: 'admin' });
        const order = await orderService.findOneByCode(ctx, dto.orderCode);

        if (!order) {
            throw new Error(`Order not found: ${dto.orderCode}`);
        }

        const sentTotal = dto.items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0)
            + (dto.shippingCost ?? 0);
        const vendureTotal: number = order.totalWithTax;
        const diff = Math.abs(sentTotal - vendureTotal);

        if (diff > 1) {
            console.error(
                `${this.prefix} Amount mismatch for ${dto.orderCode}: ` +
                `sent=${sentTotal} vendure=${vendureTotal} diff=${diff}`
            );
            throw new Error(
                `Monto inválido: el total enviado (${sentTotal}) no coincide con el total de la orden (${vendureTotal})`
            );
        }

        console.log(`${this.prefix} Amount validated for ${dto.orderCode}: ${vendureTotal} cents`);
    }

    /**
     * Create an order/checkout session in Getnet
     * This also persists the transaction to the local database
     */
    async createOrder(dto: CreateCheckoutDto): Promise<CheckoutResponse> {
        // Always validate amount against Vendure before creating any checkout session
        await this.validateAmountAgainstVendure(dto);

        if (this.isMockModeEnabled()) {
            console.log(`${this.prefix} Checkout resolution: mode=mock for order ${dto.orderCode}`);
            return this.createMockOrder(dto);
        }

        console.log(`${this.prefix} Checkout resolution: mode=real for order ${dto.orderCode}`);
        console.log(`${this.prefix} Creating order for internal order: ${dto.orderCode}`);
        
        // Build the order request payload
        const orderRequest = this.buildOrderRequest(dto);
        
        // Get fresh access token
        const accessToken = await this.getAccessToken();
        
        // Calculate total amount from items
        const totalAmount = dto.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const shippingCost = dto.shippingCost || 0;
        const finalAmount = totalAmount + shippingCost;
        
        try {
            console.debug(`${this.prefix} Order request: ${JSON.stringify(orderRequest, null, 2)}`);
            
            const response = await this.httpClient.post<GetnetOrderResponse>(
                '/api/v2/orders',
                orderRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            
            const orderData = response.data.data;
            const checkoutLink = orderData.attributes.links.find((l: { rel: string }) => l.rel === 'checkout');
            
            if (!checkoutLink) {
                console.error(`${this.prefix} No checkout link in response:`, response.data);
                throw new Error('Getnet checkout URL not found in response');
            }
            
            const checkoutUrl = checkoutLink.href;
            
            // Parse expiresAt from Getnet response
            const expiresAt = orderData.attributes.expiresAt 
                ? new Date(orderData.attributes.expiresAt) 
                : undefined;
            
            // Create transaction record in database
            const transaction = await this.transactionRepo.create({
                vendureOrderCode: dto.orderCode,
                providerOrderUuid: orderData.id,
                checkoutUrl,
                amount: finalAmount,
                currency: this.pluginConfig.currency,
                expiresAt,
                metadata: JSON.stringify({
                    ...JSON.parse(this.buildStoredMetadata(dto)),
                }),
            });
            
            // Update with checkout URL
            await this.transactionRepo.updateCheckoutUrl(transaction.id, checkoutUrl, expiresAt);
            
            console.log(`${this.prefix} Order created: ${orderData.id}, Transaction: ${transaction.id}`);
            
            return {
                mode: 'real',
                status: orderData.attributes.status,
                checkoutId: orderData.id,
                transactionId: transaction.id,
                orderUuid: orderData.id,
                processUrl: checkoutUrl,
                checkoutUrl,
                vendureOrderCode: dto.orderCode,
                expiresAt: orderData.attributes.expiresAt,
                raw: response.data,
                rawResponse: {
                    status: orderData.attributes.status,
                    createdAt: orderData.attributes.createdAt,
                },
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            const errorMessage = axiosError.message || 'Unknown error';
            console.error(`${this.prefix} Failed to create order: ${errorMessage}`);
            
            if (axiosError.response) {
                console.error(`${this.prefix} Getnet API error ${axiosError.response.status}:`, axiosError.response.data);
            }
            
            throw new Error(`Failed to create checkout: ${errorMessage}`);
        }
    }

    /**
     * Get order status from Getnet
     * Also returns local transaction state
     */
    async getOrderStatus(orderUuid: string): Promise<OrderStatusResponse> {
        if (this.isMockModeEnabled()) {
            return this.getMockOrderStatus(orderUuid);
        }

        console.log(`${this.prefix} Fetching order status: ${orderUuid}`);
        
        // First, get local transaction state
        const localTransaction = await this.transactionRepo.findByProviderOrderUuid(orderUuid);
        
        if (localTransaction) {
            console.log(`${this.prefix} Found local transaction: ${localTransaction.id}, status: ${localTransaction.status}`);
        }
        
        // Get current status from Getnet
        const accessToken = await this.getAccessToken();
        
        try {
            const response = await this.httpClient.get<GetnetOrderResponse>(
                `/api/v2/orders/${orderUuid}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            
            const orderData = response.data.data;
            
            // Map Getnet status to local status
            const providerStatus = orderData.attributes.status;
            const localStatus: GetnetPaymentStatus = mapGetnetStatus(providerStatus);
            
            // Update local transaction if status changed
            if (localTransaction && localTransaction.status !== localStatus) {
                console.log(`${this.prefix} Updating local transaction ${localTransaction.id} from ${localTransaction.status} to ${localStatus}`);
                await this.transactionRepo.updateFromWebhook(
                    orderUuid,
                    localStatus,
                    `status_check_${Date.now()}`,
                    { source: 'getOrderStatus', providerStatus }
                );
            }
            
            console.log(`${this.prefix} Order ${orderUuid} provider status: ${providerStatus}`);
            
            // Build response with both local and provider data
            const updatedTransaction = localTransaction 
                ? (await this.transactionRepo.findByProviderOrderUuid(orderUuid)) || localTransaction
                : null;
            
            return {
                transactionId: updatedTransaction?.id || '',
                orderUuid: orderData.id,
                vendureOrderCode: updatedTransaction?.vendureOrderCode || '',
                status: localStatus,
                providerStatus,
                createdAt: orderData.attributes.createdAt,
                updatedAt: orderData.attributes.updatedAt,
                expiresAt: orderData.attributes.expiresAt,
                approvedAt: updatedTransaction?.approvedAt?.toISOString(),
                isTerminal: updatedTransaction?.isTerminal ?? isTerminalStatus(localStatus),
                webhookEventCount: updatedTransaction?.webhookEventCount ?? 0,
                rawResponse: response.data,
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            const errorMessage = axiosError.message || 'Unknown error';
            console.error(`${this.prefix} Failed to get order status: ${errorMessage}`);
            
            if (axiosError.response?.status === 404) {
                throw new Error(`Order not found: ${orderUuid}`);
            }
            
            // If Getnet fails, return local state if available
            if (localTransaction) {
                console.warn(`${this.prefix} Getnet API failed, returning local state: ${localTransaction.status}`);
                return {
                    transactionId: localTransaction.id,
                    orderUuid: localTransaction.providerOrderUuid,
                    vendureOrderCode: localTransaction.vendureOrderCode,
                    status: localTransaction.status,
                    providerStatus: localTransaction.lastEvent,
                    createdAt: localTransaction.createdAt.toISOString(),
                    updatedAt: localTransaction.updatedAt.toISOString(),
                    expiresAt: localTransaction.expiresAt?.toISOString(),
                    approvedAt: localTransaction.approvedAt?.toISOString(),
                    isTerminal: localTransaction.isTerminal,
                    webhookEventCount: localTransaction.webhookEventCount,
                };
            }
            
            throw new Error(`Failed to get order status: ${errorMessage}`);
        }
    }

    /**
     * Process webhook payload
     * Handles idempotency and updates local transaction state
     */
    async processWebhook(payload: GetnetWebhookPayload): Promise<{ success: boolean; message: string; isIdempotent: boolean }> {
        console.log(`${this.prefix} Webhook received - Event: ${payload.event}, Order: ${payload.orderUuid}, Status: ${payload.status}`);
        console.debug(`${this.prefix} Webhook payload: ${JSON.stringify(payload, null, 2)}`);
        
        try {
            // Validate required fields
            if (!payload.event) {
                return { success: false, message: 'Missing event type', isIdempotent: false };
            }
            
            if (!payload.orderUuid) {
                return { success: false, message: 'Missing order UUID', isIdempotent: false };
            }
            
            if (!payload.status) {
                return { success: false, message: 'Missing status', isIdempotent: false };
            }
            
            // Map Getnet status to local status
            const localStatus = mapGetnetStatus(payload.status);
            
            // Update transaction with webhook data (handles idempotency internally)
            const result = await this.transactionRepo.updateFromWebhook(
                payload.orderUuid,
                localStatus,
                payload.event,
                payload
            );
            
            if (!result) {
                return { success: false, message: `Transaction not found for order: ${payload.orderUuid}`, isIdempotent: false };
            }
            
            const { transaction, isIdempotent } = result;
            
            if (isIdempotent) {
                console.log(`${this.prefix} Webhook idempotent (already processed): ${transaction.id}`);
                return {
                    success: true,
                    message: 'Webhook already processed',
                    isIdempotent: true,
                };
            }
            
            // Handle state transitions
            await this.handleStatusTransition(transaction, payload);
            
            console.log(`${this.prefix} Webhook processed for transaction ${transaction.id}, status: ${transaction.status}`);
            
            return {
                success: true,
                message: `Webhook processed for transaction ${transaction.id}`,
                isIdempotent: false,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`${this.prefix} Webhook processing failed: ${errorMessage}`);
            
            return {
                success: false,
                message: `Webhook processing failed: ${errorMessage}`,
                isIdempotent: false,
            };
        }
    }

    /**
     * Handle status transitions after webhook is received.
     * Uses addManualPaymentToOrder (correct Vendure 2.x API) and handles
     * idempotency separately for payment registration vs. state transition.
     */
    private async handleStatusTransition(
        transaction: GetnetPaymentTransaction,
        payload: GetnetWebhookPayload
    ): Promise<void> {
        console.log(`${this.prefix} Handling status transition for transaction ${transaction.id}: ${transaction.status}`);

        const orderService = (this as any).orderService;
        const requestContextService = (this as any).requestContextService;

        if (!orderService || !requestContextService) {
            console.warn(`${this.prefix} Vendure services not available – skipping order update.`);
            console.warn(`${this.prefix} Call setVendureServices() during bootstrap to enable this.`);
            return;
        }

        try {
            const ctx = await requestContextService.create({ apiType: 'admin' });

            if (transaction.status === 'approved') {
                await this.handleApprovedPayment(transaction, ctx, orderService);
            } else if (['rejected', 'cancelled', 'expired'].includes(transaction.status)) {
                await this.handleFailedPayment(transaction, ctx, orderService);
            }
        } catch (error: any) {
            console.error(`${this.prefix} Error in handleStatusTransition: ${error.message}`);
            console.error(`${this.prefix} Stack: ${error.stack}`);
        }
    }

    private async handleApprovedPayment(
        transaction: GetnetPaymentTransaction,
        ctx: any,
        orderService: any,
    ): Promise<void> {
        console.log(`${this.prefix} Processing APPROVED for order ${transaction.vendureOrderCode}`);

        const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode, ['payments', 'lines']);
        if (!order) {
            console.error(`${this.prefix} Order not found: ${transaction.vendureOrderCode}`);
            return;
        }

        // ── Step 1: Register payment (idempotent by transactionId) ────────────
        const alreadyHasPayment = (order.payments ?? []).some(
            (p: any) => p.transactionId === transaction.providerOrderUuid
        );

        if (!alreadyHasPayment) {
            // Correct Vendure 2.x API: OrderService.addManualPaymentToOrder
            const paymentResult = await orderService.addManualPaymentToOrder(ctx, {
                orderId: order.id,
                method: 'getnet',
                transactionId: transaction.providerOrderUuid,
                metadata: {
                    provider: 'getnet',
                    getnetTransactionId: transaction.id,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    approvedAt: transaction.approvedAt?.toISOString(),
                },
            });

            if (paymentResult && typeof paymentResult === 'object' && 'message' in paymentResult) {
                console.error(`${this.prefix} addManualPaymentToOrder error: ${(paymentResult as any).message}`);
                // Do NOT return here — the state transition may still be needed if payment
                // was registered in a prior run but the state transition failed.
            } else {
                console.log(`${this.prefix} Payment added to order ${transaction.vendureOrderCode}`);
            }
        } else {
            console.log(`${this.prefix} Payment already registered for ${transaction.vendureOrderCode}`);
        }

        // ── Step 2: Transition state (idempotent: only if not already settled) ─
        const freshOrder = await orderService.findOneByCode(ctx, transaction.vendureOrderCode);
        const TERMINAL_STATES = ['PaymentSettled', 'Shipped', 'PartiallyShipped', 'Delivered'];
        if (freshOrder && !TERMINAL_STATES.includes(freshOrder.state)) {
            try {
                await orderService.transitionToState(ctx, freshOrder.id, 'PaymentSettled');
                console.log(`${this.prefix} Order ${transaction.vendureOrderCode} → PaymentSettled`);
            } catch (stateErr: any) {
                console.warn(`${this.prefix} State transition skipped: ${stateErr.message}`);
            }
        }

        // ── Step 3: Sync personalization (enable uploads). NO shipment here. ───
        await this.syncPersonalizationForOrder(transaction.vendureOrderCode);
    }

    private async handleFailedPayment(
        transaction: GetnetPaymentTransaction,
        ctx: any,
        orderService: any,
    ): Promise<void> {
        console.log(`${this.prefix} Processing FAILED (${transaction.status}) for order ${transaction.vendureOrderCode}`);

        const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode);
        if (!order) {
            console.error(`${this.prefix} Order not found: ${transaction.vendureOrderCode}`);
            return;
        }

        const ALREADY_CANCELLED = ['Cancelled'];
        if (ALREADY_CANCELLED.includes(order.state)) {
            console.log(`${this.prefix} Order already cancelled: ${transaction.vendureOrderCode}`);
            return;
        }

        try {
            await orderService.transitionToState(ctx, order.id, 'Cancelled');
            console.log(`${this.prefix} Order ${transaction.vendureOrderCode} → Cancelled`);
        } catch (stateErr: any) {
            console.warn(`${this.prefix} Could not cancel order: ${stateErr.message}`);
        }
    }
    
    /**
     * Set Vendure services for integration
     * Call this during Vendure bootstrap to enable order/payment updates
     */
    public setVendureServices(services: {
        orderService: any;
        paymentService: any;
        requestContextService: any;
        eventBus?: any;
    }): void {
        (this as any).orderService = services.orderService;
        (this as any).paymentService = services.paymentService;
        (this as any).requestContextService = services.requestContextService;
        (this as any).eventBus = services.eventBus;
        console.log(`${this.prefix} Vendure services registered`);
    }

    public setAndreaniShipmentService(service: AndreaniShipmentService | null): void {
        this.andreaniShipmentService = service;
    }

    public setPersonalizationService(service: PersonalizationService | null): void {
        this.personalizationService = service;
    }

    private async createShipmentForOrder(order: Order): Promise<void> {
        if (!this.andreaniShipmentService) {
            console.log(`${this.prefix} Andreani is disabled or unavailable; skipping shipment creation for order ${order.code}`);
            return;
        }

        const result = await this.andreaniShipmentService.createShipment(order);
        if (!result.success) {
            console.warn(`${this.prefix} Andreani shipment creation skipped: ${result.error}`);
        } else {
            console.log(`${this.prefix} Andreani shipment created for order ${order.code}: ${result.shipmentId}`);
        }
    }

    private async syncPersonalizationForOrder(orderCode: string): Promise<void> {
        if (!this.personalizationService) {
            return;
        }

        try {
            await this.personalizationService.syncOrderAfterPayment(orderCode);
        } catch (error) {
            console.warn(`${this.prefix} Personalization sync skipped for ${orderCode}:`, error);
        }
    }

    /**
     * Find transaction by local ID
     */
    async findTransactionById(id: string): Promise<GetnetPaymentTransaction | null> {
        return this.transactionRepo.findById(id);
    }

    /**
     * Find transaction by Getnet order UUID
     */
    async findTransactionByProviderOrderUuid(providerOrderUuid: string): Promise<GetnetPaymentTransaction | null> {
        return this.transactionRepo.findByProviderOrderUuid(providerOrderUuid);
    }

    /**
     * Find transaction by Vendure order code
     */
    async findTransactionByVendureOrderCode(vendureOrderCode: string): Promise<GetnetPaymentTransaction | null> {
        return this.transactionRepo.findByVendureOrderCode(vendureOrderCode);
    }

    /**
     * Build order request payload for Getnet API
     */
    private buildOrderRequest(dto: CreateCheckoutDto): GetnetOrderRequest {
        const items = dto.items.map((item, index) => ({
            id: item.id || `item-${index}`,
            name: item.name,
            quantity: item.quantity,
            unitPrice: {
                currency: this.pluginConfig.currency,
                amount: item.unitPrice, // Already in cents
            },
        }));
        
        // Build redirect URLs from config or dto
        const redirectUrls: GetnetOrderRequest['redirectUrls'] = {
            success: dto.successUrl || this.pluginConfig.successUrl || 'http://localhost:3000/checkout/success',
            failed: dto.failedUrl || this.pluginConfig.failedUrl || 'http://localhost:3000/checkout/failed',
        };
        
        const request: GetnetOrderRequest = {
            currency: this.pluginConfig.currency,
            items,
            redirectUrls,
        };
        
        // Optional: Add webhook URL if configured
        if (this.pluginConfig.webhookUrl) {
            request.webhookUrl = this.pluginConfig.webhookUrl;
        }
        
        // Optional: Add expiration limit if configured
        if (this.pluginConfig.expireLimitMinutes) {
            request.expireLimitMinutes = this.pluginConfig.expireLimitMinutes;
        }
        
        // Optional: Add shipping if cost is provided
        if (dto.shippingCost && dto.shippingCost > 0) {
            // TODO: Add full shipping address collection in frontend
            // For now, add a placeholder shipping item
            items.push({
                id: 'shipping',
                name: 'Costo de envío',
                quantity: 1,
                unitPrice: {
                    currency: this.pluginConfig.currency,
                    amount: dto.shippingCost,
                },
            });
        }
        
        return request;
    }
}
