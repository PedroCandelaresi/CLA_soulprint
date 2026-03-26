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
} from './getnet.types';
import {
    GetnetPaymentTransaction,
    GetnetPaymentStatus,
    mapGetnetStatus,
    isTerminalStatus,
} from './getnet-transaction.entity';
import { GetnetTransactionRepository } from './getnet-transaction.repository';

const GETNET_LOG_PREFIX = '[getnet]';

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
    }

    /**
     * Get or refresh OAuth token
     * Uses cached token if still valid (with buffer time)
     */
    async getAccessToken(): Promise<string> {
        const now = Date.now();
        const bufferMs = GetnetService.TOKEN_REFRESH_BUFFER * 1000;
        
        // Return cached token if still valid (with buffer)
        if (this.cachedToken && this.tokenExpiresAt > now + bufferMs) {
            console.debug(`${this.prefix} Using cached OAuth token`);
            return this.cachedToken;
        }
        
        // Need to refresh token
        console.log(`${this.prefix} Refreshing OAuth token...`);
        
        try {
            const response = await axios.post<GetnetOAuthTokenResponse>(
                `${this.oauthConfig.baseUrl}/oauth/token`,
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
            throw new Error('Getnet authentication failed');
        }
    }

    /**
     * Create an order/checkout session in Getnet
     * This also persists the transaction to the local database
     */
    async createOrder(dto: CreateCheckoutDto): Promise<CheckoutResponse> {
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
                    itemCount: dto.items.length,
                    createdFrom: 'createOrder',
                }),
            });
            
            // Update with checkout URL
            await this.transactionRepo.updateCheckoutUrl(transaction.id, checkoutUrl, expiresAt);
            
            console.log(`${this.prefix} Order created: ${orderData.id}, Transaction: ${transaction.id}`);
            
            return {
                transactionId: transaction.id,
                orderUuid: orderData.id,
                checkoutUrl,
                vendureOrderCode: dto.orderCode,
                expiresAt: orderData.attributes.expiresAt,
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
     * Handle status transitions
     * Integrates with Vendure's order/payment system when webhooks are received
     */
    private async handleStatusTransition(
        transaction: GetnetPaymentTransaction,
        payload: GetnetWebhookPayload
    ): Promise<void> {
        console.log(`${this.prefix} Handling status transition for transaction ${transaction.id}: ${transaction.status}`);
        
        // Get Vendure application services (set during initialization)
        const orderService = (this as any).orderService;
        const paymentService = (this as any).paymentService;
        const requestContextService = (this as any).requestContextService;
        const eventBus = (this as any).eventBus;
        
        if (!orderService || !paymentService || !requestContextService) {
            console.warn(`${this.prefix} Vendure services not available. Skipping order update.`);
            console.warn(`${this.prefix} To enable Vendure integration, set services via setVendureServices()`);
            return;
        }
        
        try {
            // Create admin context for operations
            const ctx = await requestContextService.create({ apiType: 'admin' });
            
            if (transaction.status === 'approved') {
                console.log(`${this.prefix} Processing APPROVED payment for order ${transaction.vendureOrderCode}`);
                
                // Find the Vendure order
                const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode);
                
                if (!order) {
                    console.error(`${this.prefix} Order not found: ${transaction.vendureOrderCode}`);
                    return;
                }
                
                // Check if payment already exists (idempotency)
                const existingPayments = await paymentService.findAll(ctx, {
                    orderId: order.id,
                });
                
                const alreadyProcessed = existingPayments.items.some(
                    (payment: any) => payment.transactionId === transaction.providerOrderUuid
                );
                
                if (alreadyProcessed) {
                    console.log(`${this.prefix} Payment already registered for order ${transaction.vendureOrderCode}, skipping`);
                    return;
                }
                
                // Add payment to order
                await paymentService.create(ctx, {
                    orderId: order.id,
                    method: 'getnet',
                    amount: transaction.amount / 100, // Convert from cents to major currency
                    transactionId: transaction.providerOrderUuid,
                    metadata: {
                        provider: 'getnet',
                        getnetTransactionId: transaction.id,
                        currency: transaction.currency,
                        originalAmount: transaction.amount,
                    },
                });
                
                console.log(`${this.prefix} Payment added to Vendure order ${transaction.vendureOrderCode}`);
                
                // Transition order to PaymentSettled state
                try {
                    await orderService.transitionToState(ctx, order.id, 'PaymentSettled');
                    console.log(`${this.prefix} Order ${transaction.vendureOrderCode} transitioned to PaymentSettled`);
                } catch (stateError: any) {
                    // Order might already be in a terminal state or state transition not available
                    console.warn(`${this.prefix} Could not transition order state: ${stateError.message}`);
                }
                
            } else if (transaction.status === 'rejected' || transaction.status === 'cancelled' || transaction.status === 'expired') {
                console.log(`${this.prefix} Processing FAILED payment (${transaction.status}) for order ${transaction.vendureOrderCode}`);
                
                // Find the Vendure order
                const order = await orderService.findOneByCode(ctx, transaction.vendureOrderCode);
                
                if (!order) {
                    console.error(`${this.prefix} Order not found: ${transaction.vendureOrderCode}`);
                    return;
                }
                
                // Transition order to Cancelled or some failure state
                // Note: The exact state depends on your Vendure configuration
                try {
                    await orderService.transitionToState(ctx, order.id, 'Cancelled');
                    console.log(`${this.prefix} Order ${transaction.vendureOrderCode} transitioned to Cancelled`);
                } catch (stateError: any) {
                    // Order might already be in a terminal state or state transition not available
                    console.warn(`${this.prefix} Could not transition order state: ${stateError.message}`);
                }
            }
        } catch (error: any) {
            console.error(`${this.prefix} Error handling status transition: ${error.message}`);
            console.error(`${this.prefix} Stack: ${error.stack}`);
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
