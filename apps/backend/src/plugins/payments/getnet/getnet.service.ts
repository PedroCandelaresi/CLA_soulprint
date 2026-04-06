import { randomUUID } from 'node:crypto';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DataSource } from 'typeorm';
import {
    EventBus,
    isGraphQlErrorResult,
    Order,
    OrderService,
    PaymentService,
    RequestContext,
    RequestContextService,
} from '@vendure/core';
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
import type { PersonalizationService } from '../../logistics/personalization/personalization.service';

const GETNET_LOG_PREFIX = '[getnet]';

type VendureServices = {
    orderService: OrderService;
    paymentService?: PaymentService;
    requestContextService: RequestContextService;
    eventBus?: EventBus;
};

type GetnetStoredMetadata = {
    itemCount?: number;
    vendureTotalWithTax?: number;
    vendureCurrencyCode?: string;
    vendureOrderState?: string;
    storefrontAmount?: number | null;
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
    private personalizationService: PersonalizationService | null = null;
    private vendureServices: VendureServices | null = null;
    
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

    private getVendureServicesOrThrow(): VendureServices {
        if (!this.vendureServices?.orderService || !this.vendureServices?.requestContextService) {
            throw new Error('Vendure services not registered for Getnet payment flow');
        }

        return this.vendureServices;
    }

    private async createAdminContext(): Promise<RequestContext> {
        return this.getVendureServicesOrThrow().requestContextService.create({ apiType: 'admin' });
    }

    private async getAuthoritativeOrder(orderCode: string, ctx?: RequestContext): Promise<Order> {
        const context = ctx ?? await this.createAdminContext();
        const { orderService } = this.getVendureServicesOrThrow();
        const order = await orderService.findOneByCode(context, orderCode, [
            'lines',
            'lines.productVariant',
            'shippingLines',
            'payments',
        ]);

        if (!order) {
            throw new Error(`Order not found: ${orderCode}`);
        }

        return order;
    }

    private assertOrderReadyForCheckout(order: Order): void {
        const allowedStates = ['ArrangingPayment', 'ArrangingAdditionalPayment'];
        if (!allowedStates.includes(order.state)) {
            throw new Error(
                `Order ${order.code} must be ready for payment (state=${order.state}, expected one of: ${allowedStates.join(', ')})`,
            );
        }
    }

    private calculateStorefrontAmount(dto: CreateCheckoutDto): number | null {
        if (!dto.items?.length) {
            return null;
        }

        return dto.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
            + (dto.shippingCost ?? 0);
    }

    private validateAmountAgainstVendure(order: Order, dto: CreateCheckoutDto): void {
        const storefrontAmount = this.calculateStorefrontAmount(dto);

        if (storefrontAmount == null) {
            console.log(
                `${this.prefix} [testing] Checkout ${order.code}: frontend amount omitted, using Vendure total=${order.totalWithTax}`,
            );
            return;
        }

        const vendureTotal = order.totalWithTax;
        const diff = Math.abs(storefrontAmount - vendureTotal);

        if (diff > 1) {
            console.error(
                `${this.prefix} [testing] Amount mismatch for ${order.code}: storefront=${storefrontAmount} vendure=${vendureTotal} diff=${diff}`,
            );
            throw new Error(
                `Monto inválido: el total enviado (${storefrontAmount}) no coincide con el total de la orden (${vendureTotal})`,
            );
        }

        console.log(
            `${this.prefix} [testing] Checkout ${order.code}: storefront amount validated against Vendure total=${vendureTotal}`,
        );
    }

    private assertTransactionAmountMatchesOrder(transaction: GetnetPaymentTransaction, order: Order): void {
        const diff = Math.abs(transaction.amount - order.totalWithTax);
        if (diff > 1) {
            console.error(
                `${this.prefix} [testing] Approved payment blocked for ${order.code}: stored transaction amount=${transaction.amount}, vendure total=${order.totalWithTax}, diff=${diff}`,
            );
            throw new Error(
                `Cannot register payment for ${order.code}: transaction amount ${transaction.amount} does not match Vendure total ${order.totalWithTax}`,
            );
        }

        console.log(
            `${this.prefix} [testing] Approved payment ${transaction.id}: amount ${transaction.amount} matches Vendure total for ${order.code}`,
        );
    }

    private buildStoredMetadata(
        dto: CreateCheckoutDto,
        order: Order,
        extra?: Partial<GetnetStoredMetadata>,
    ): string {
        const metadata: GetnetStoredMetadata = {
            itemCount: order.lines?.length ?? 0,
            vendureTotalWithTax: order.totalWithTax,
            vendureCurrencyCode: String(order.currencyCode ?? ''),
            vendureOrderState: order.state,
            storefrontAmount: this.calculateStorefrontAmount(dto),
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

    private buildMockCheckoutUrl(orderUuid: string): string {
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

    private async createMockOrder(dto: CreateCheckoutDto, order: Order): Promise<CheckoutResponse> {
        console.log(
            `${this.prefix} [mock] Creating mock checkout for order ${dto.orderCode} using Vendure total=${order.totalWithTax}`,
        );

        const providerOrderUuid = `mock-${randomUUID()}`;
        const checkoutUrl = this.buildMockCheckoutUrl(providerOrderUuid);
        const expiresAt = this.pluginConfig.expireLimitMinutes
            ? new Date(Date.now() + this.pluginConfig.expireLimitMinutes * 60_000)
            : undefined;

        const transaction = await this.transactionRepo.create({
            vendureOrderCode: dto.orderCode,
            providerOrderUuid,
            checkoutUrl,
            amount: order.totalWithTax,
            currency: this.pluginConfig.currency,
            expiresAt,
            metadata: this.buildStoredMetadata(dto, order, {
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
     * Create an order/checkout session in Getnet
     * This also persists the transaction to the local database
     */
    async createOrder(dto: CreateCheckoutDto): Promise<CheckoutResponse> {
        // Standalone mock mode: no Vendure DI available (standalone server process).
        // Build a synthetic order from the DTO and skip Vendure validation.
        if (this.isMockModeEnabled() && !this.vendureServices?.orderService) {
            console.log(`${this.prefix} [mock] Standalone mode: building synthetic order from DTO for ${dto.orderCode}`);
            const storefrontAmount = this.calculateStorefrontAmount(dto);
            if (storefrontAmount == null) {
                throw new Error('[mock] items with unitPrice and quantity are required in standalone mock mode');
            }
            const syntheticOrder = {
                code: dto.orderCode,
                state: 'ArrangingPayment',
                totalWithTax: storefrontAmount,
                lines: dto.items?.map(() => ({})) ?? [],
                currencyCode: 'ARS',
            } as unknown as Order;
            return this.createMockOrder(dto, syntheticOrder);
        }

        const ctx = await this.createAdminContext();
        const order = await this.getAuthoritativeOrder(dto.orderCode, ctx);
        this.assertOrderReadyForCheckout(order);
        this.validateAmountAgainstVendure(order, dto);

        if (this.isMockModeEnabled()) {
            console.log(`${this.prefix} Checkout resolution: mode=mock for order ${dto.orderCode}`);
            return this.createMockOrder(dto, order);
        }

        console.log(`${this.prefix} Checkout resolution: mode=real for order ${dto.orderCode}`);
        console.log(
            `${this.prefix} [testing] Creating real Getnet checkout for ${dto.orderCode} using Vendure total=${order.totalWithTax}`,
        );
        
        // Build the order request payload
        const orderRequest = this.buildOrderRequest(order, dto);
        
        // Get fresh access token
        const accessToken = await this.getAccessToken();
        
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
                amount: order.totalWithTax,
                currency: this.pluginConfig.currency,
                expiresAt,
                metadata: this.buildStoredMetadata(dto, order),
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
                console.log(`${this.prefix} Webhook idempotent at transaction layer: ${transaction.id}`);

                if (isTerminalStatus(localStatus)) {
                    console.log(
                        `${this.prefix} [testing] Re-running Vendure reconciliation for terminal webhook ${transaction.id} (status=${transaction.status})`,
                    );
                    await this.handleStatusTransition(transaction, payload);
                }

                return {
                    success: true,
                    message: isTerminalStatus(localStatus)
                        ? 'Webhook already processed; Vendure reconciliation rechecked'
                        : 'Webhook already processed',
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

        const { orderService } = this.getVendureServicesOrThrow();
        const ctx = await this.createAdminContext();

        if (transaction.status === 'approved') {
            await this.handleApprovedPayment(transaction, ctx, orderService, payload);
        } else if (['rejected', 'cancelled', 'expired'].includes(transaction.status)) {
            await this.handleFailedPayment(transaction, ctx, orderService);
        } else {
            console.log(
                `${this.prefix} [testing] No Vendure transition needed for transaction ${transaction.id} in status=${transaction.status}`,
            );
        }
    }

    private hasRegisteredPayment(order: Order, transaction: GetnetPaymentTransaction): boolean {
        return (order.payments ?? []).some(payment => {
            const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
            return payment.transactionId === transaction.providerOrderUuid
                || payment.transactionId === transaction.id
                || metadata['getnetTransactionId'] === transaction.id;
        });
    }

    private canRegisterManualPayment(order: Order): boolean {
        return ['ArrangingPayment', 'ArrangingAdditionalPayment'].includes(order.state);
    }

    private canTransitionOrderToPaymentSettled(order: Order): boolean {
        return !['PaymentSettled', 'PartiallyShipped', 'Shipped', 'Delivered'].includes(order.state);
    }

    private async handleApprovedPayment(
        transaction: GetnetPaymentTransaction,
        ctx: RequestContext,
        orderService: OrderService,
        payload: GetnetWebhookPayload,
    ): Promise<void> {
        console.log(
            `${this.prefix} [testing] Processing APPROVED webhook for order ${transaction.vendureOrderCode}, transaction=${transaction.id}`,
        );

        const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode, [
            'payments',
            'lines',
            'shippingLines',
        ]);
        if (!order) {
            throw new Error(`Order not found: ${transaction.vendureOrderCode}`);
        }

        const alreadyHasPayment = this.hasRegisteredPayment(order, transaction);

        if (!alreadyHasPayment) {
            this.assertTransactionAmountMatchesOrder(transaction, order);

            if (!this.canRegisterManualPayment(order)) {
                throw new Error(
                    `Cannot register payment for ${order.code}: order state ${order.state} does not allow addManualPaymentToOrder`,
                );
            }

            console.log(
                `${this.prefix} [testing] Registering manual payment in Vendure for ${order.code} with providerOrderUuid=${transaction.providerOrderUuid}`,
            );

            const paymentResult = await orderService.addManualPaymentToOrder(ctx, {
                orderId: order.id,
                method: 'getnet',
                transactionId: transaction.providerOrderUuid,
                metadata: {
                    provider: 'getnet',
                    webhookEvent: payload.event,
                    webhookStatus: payload.status,
                    getnetTransactionId: transaction.id,
                    providerOrderUuid: transaction.providerOrderUuid,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    approvedAt: transaction.approvedAt?.toISOString(),
                },
            });

            if (isGraphQlErrorResult(paymentResult)) {
                throw new Error(`addManualPaymentToOrder failed: ${paymentResult.message}`);
            }

            console.log(`${this.prefix} [testing] Payment registered in Vendure for ${transaction.vendureOrderCode}`);
        } else {
            console.log(
                `${this.prefix} [testing] Payment already registered for ${transaction.vendureOrderCode}; skipping addManualPaymentToOrder`,
            );
        }

        const freshOrder = await orderService.findOneByCode(ctx, transaction.vendureOrderCode, ['payments']);
        if (!freshOrder) {
            throw new Error(`Order not found after payment registration: ${transaction.vendureOrderCode}`);
        }

        if (!this.hasRegisteredPayment(freshOrder, transaction)) {
            throw new Error(`Payment registration could not be verified for order ${transaction.vendureOrderCode}`);
        }

        await this.syncPersonalizationForOrder(transaction.vendureOrderCode);

        if (this.canTransitionOrderToPaymentSettled(freshOrder)) {
            console.log(
                `${this.prefix} [testing] Reconciling order state for ${freshOrder.code}; current=${freshOrder.state}, target=PaymentSettled`,
            );
            const transitionResult = await orderService.transitionToState(ctx, freshOrder.id, 'PaymentSettled');
            if (isGraphQlErrorResult(transitionResult)) {
                throw new Error(`transitionToState(PaymentSettled) failed: ${transitionResult.message}`);
            }
            console.log(`${this.prefix} [testing] Order ${transaction.vendureOrderCode} reconciled to PaymentSettled`);
        } else {
            console.log(
                `${this.prefix} [testing] Order ${freshOrder.code} already beyond payment settlement (state=${freshOrder.state}); no transition needed`,
            );
        }

        console.log(
            `${this.prefix} [testing] Shipment creation is intentionally disabled after payment for ${transaction.vendureOrderCode}`,
        );
    }

    private async handleFailedPayment(
        transaction: GetnetPaymentTransaction,
        ctx: RequestContext,
        orderService: OrderService,
    ): Promise<void> {
        console.log(`${this.prefix} Processing FAILED (${transaction.status}) for order ${transaction.vendureOrderCode}`);

        const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode);
        if (!order) {
            throw new Error(`Order not found: ${transaction.vendureOrderCode}`);
        }

        const ALREADY_CANCELLED = ['Cancelled'];
        if (ALREADY_CANCELLED.includes(order.state)) {
            console.log(`${this.prefix} Order already cancelled: ${transaction.vendureOrderCode}`);
            return;
        }

        const transitionResult = await orderService.transitionToState(ctx, order.id, 'Cancelled');
        if (isGraphQlErrorResult(transitionResult)) {
            throw new Error(`transitionToState(Cancelled) failed: ${transitionResult.message}`);
        }

        console.log(`${this.prefix} Order ${transaction.vendureOrderCode} → Cancelled`);
    }
    
    /**
     * Set Vendure services for integration
     * Call this during Vendure bootstrap to enable order/payment updates
     */
    public setVendureServices(services: {
        orderService: OrderService;
        paymentService?: PaymentService;
        requestContextService: RequestContextService;
        eventBus?: EventBus;
    }): void {
        this.vendureServices = {
            orderService: services.orderService,
            paymentService: services.paymentService,
            requestContextService: services.requestContextService,
            eventBus: services.eventBus,
        };
        console.log(`${this.prefix} Vendure services registered explicitly for checkout/webhook reconciliation`);
    }

    public setPersonalizationService(service: PersonalizationService | null): void {
        this.personalizationService = service;
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
    private buildOrderRequest(order: Order, dto: CreateCheckoutDto): GetnetOrderRequest {
        const items = order.lines.map((line, index) => ({
            id: String(line.productVariantId ?? line.id ?? `line-${index}`),
            name: String(line.productVariant?.name || `Linea ${index + 1}`),
            quantity: line.quantity,
            unitPrice: {
                currency: this.pluginConfig.currency,
                amount: line.proratedUnitPriceWithTax ?? line.discountedUnitPriceWithTax ?? line.unitPriceWithTax,
            },
        }));

        if (order.shippingLines?.length) {
            order.shippingLines.forEach((shippingLine, index) => {
                const amount = shippingLine.discountedPriceWithTax ?? shippingLine.priceWithTax ?? 0;
                if (amount > 0) {
                    items.push({
                        id: `shipping-${index + 1}`,
                        name: 'Costo de envío',
                        quantity: 1,
                        unitPrice: {
                            currency: this.pluginConfig.currency,
                            amount,
                        },
                    });
                }
            });
        } else if (order.shippingWithTax > 0) {
            items.push({
                id: 'shipping',
                name: 'Costo de envío',
                quantity: 1,
                unitPrice: {
                    currency: this.pluginConfig.currency,
                    amount: order.shippingWithTax,
                },
            });
        }
        
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

        return request;
    }
}
