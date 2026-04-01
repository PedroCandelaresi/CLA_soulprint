import { createGetnetHandlers } from '../getnet.controller';
import { GetnetService } from '../getnet.service';
import { CreateCheckoutDto, CheckoutResponse, OrderStatusResponse, GetnetWebhookPayload } from '../getnet.types';

// Mock console methods to keep test output clean
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('GetnetController', () => {
    let mockService: {
        createOrder: jest.Mock<Promise<CheckoutResponse>, [CreateCheckoutDto]>;
        getOrderStatus: jest.Mock<Promise<OrderStatusResponse>, [string]>;
        processWebhook: jest.Mock<Promise<{ success: boolean; message: string; isIdempotent: boolean }>, [GetnetWebhookPayload]>;
        findTransactionById: jest.Mock;
    };
    let handlers: ReturnType<typeof createGetnetHandlers>;
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockService = {
            createOrder: jest.fn(),
            getOrderStatus: jest.fn(),
            processWebhook: jest.fn(),
            findTransactionById: jest.fn(),
        };

        handlers = createGetnetHandlers(mockService as unknown as GetnetService);

        mockReq = {
            body: {},
            params: {},
            path: '',
            method: '',
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createCheckout', () => {
        const validCheckoutDto: CreateCheckoutDto = {
            orderCode: 'ORD-001',
            items: [
                {
                    id: 'item-1',
                    name: 'Product 1',
                    quantity: 2,
                    unitPrice: 1000,
                },
            ],
        };

        const validCheckoutResponse: CheckoutResponse = {
            mode: 'real',
            status: 'pending',
            checkoutId: 'getnet-uuid-123',
            transactionId: 'local-tx-uuid-123',
            orderUuid: 'getnet-uuid-123',
            processUrl: 'https://checkout.getnet.com/pay/123',
            checkoutUrl: 'https://checkout.getnet.com/pay/123',
            vendureOrderCode: 'ORD-001',
            expiresAt: '2024-01-01T12:00:00Z',
            rawResponse: {
                status: 'pending',
                createdAt: '2024-01-01T10:00:00Z',
            },
        };

        it('should create checkout successfully', async () => {
            mockService.createOrder.mockResolvedValue(validCheckoutResponse);
            mockReq.body = validCheckoutDto;

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockService.createOrder).toHaveBeenCalledWith(validCheckoutDto);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: validCheckoutResponse,
            });
        });

        it('should return 400 when orderCode is missing', async () => {
            mockReq.body = {
                items: [{ name: 'Test', quantity: 1, unitPrice: 100 }],
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing required field: orderCode',
            });
        });

        it('should allow checkout creation without items when backend resolves order totals from Vendure', async () => {
            mockService.createOrder.mockResolvedValue(validCheckoutResponse);
            mockReq.body = {
                orderCode: 'ORD-001',
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockService.createOrder).toHaveBeenCalledWith({
                orderCode: 'ORD-001',
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('should allow checkout creation when items array is empty', async () => {
            mockService.createOrder.mockResolvedValue(validCheckoutResponse);
            mockReq.body = {
                orderCode: 'ORD-001',
                items: [],
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('should return 400 when items is not an array', async () => {
            mockReq.body = {
                orderCode: 'ORD-001',
                items: 'invalid',
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'items must be an array when provided',
            });
        });

        it('should return 400 when item has invalid quantity', async () => {
            mockReq.body = {
                orderCode: 'ORD-001',
                items: [
                    { name: 'Test', quantity: 0, unitPrice: 100 },
                ],
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when item has invalid unitPrice', async () => {
            mockReq.body = {
                orderCode: 'ORD-001',
                items: [
                    { name: 'Test', quantity: 1, unitPrice: -100 },
                ],
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 when service throws error', async () => {
            mockService.createOrder.mockRejectedValue(new Error('Service error'));
            mockReq.body = validCheckoutDto;

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Service error',
            });
        });

        it('should return 400 when service reports invalid amount', async () => {
            mockService.createOrder.mockRejectedValue(
                new Error('Monto inválido: el total enviado (100) no coincide con el total de la orden (200)'),
            );
            mockReq.body = validCheckoutDto;

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getOrderStatus', () => {
        const validOrderStatusResponse: OrderStatusResponse = {
            transactionId: 'local-tx-uuid-123',
            orderUuid: 'getnet-uuid-123',
            vendureOrderCode: 'ORD-001',
            status: 'approved',
            providerStatus: 'approved',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:05:00Z',
            isTerminal: true,
            webhookEventCount: 2,
        };

        it('should return order status successfully', async () => {
            mockService.getOrderStatus.mockResolvedValue(validOrderStatusResponse);
            mockReq.params = { uuid: 'getnet-uuid-123' };

            await handlers.getOrderStatus(mockReq, mockRes, mockNext);

            expect(mockService.getOrderStatus).toHaveBeenCalledWith('getnet-uuid-123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: validOrderStatusResponse,
            });
        });

        it('should return 400 when uuid is missing', async () => {
            mockReq.params = {};

            await handlers.getOrderStatus(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when order not found', async () => {
            mockService.getOrderStatus.mockRejectedValue(new Error('Order not found: xyz'));
            mockReq.params = { uuid: 'xyz' };

            await handlers.getOrderStatus(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 when service throws generic error', async () => {
            mockService.getOrderStatus.mockRejectedValue(new Error('Internal error'));
            mockReq.params = { uuid: 'some-uuid' };

            await handlers.getOrderStatus(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('handleWebhook', () => {
        const validWebhookPayload: GetnetWebhookPayload = {
            event: 'payment.approved',
            orderUuid: 'getnet-uuid-123',
            orderId: 'getnet-uuid-123',
            status: 'approved',
            timestamp: '2024-01-01T10:05:00Z',
        };

        it('should process webhook successfully', async () => {
            mockService.processWebhook.mockResolvedValue({
                success: true,
                message: 'Webhook processed',
                isIdempotent: false,
            });

            mockReq.body = validWebhookPayload;

            await handlers.handleWebhook(mockReq, mockRes, mockNext);

            expect(mockService.processWebhook).toHaveBeenCalledWith(validWebhookPayload);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Webhook processed',
                isIdempotent: false,
            });
        });

        it('should handle idempotent webhook', async () => {
            mockService.processWebhook.mockResolvedValue({
                success: true,
                message: 'Webhook already processed',
                isIdempotent: true,
            });

            mockReq.body = validWebhookPayload;

            await handlers.handleWebhook(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Webhook already processed',
                isIdempotent: true,
            });
        });

        it('should always return 200 even on service error', async () => {
            mockService.processWebhook.mockRejectedValue(new Error('Unexpected error'));

            mockReq.body = validWebhookPayload;

            await handlers.handleWebhook(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                })
            );
        });
    });

    describe('healthCheck', () => {
        it('should return healthy status', async () => {
            await handlers.healthCheck(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Getnet payment service is healthy',
                })
            );
        });
    });

    describe('getTransaction', () => {
        it('should return transaction when found', async () => {
            const mockTransaction = {
                id: 'local-tx-uuid',
                vendureOrderCode: 'ORD-001',
                providerOrderUuid: 'getnet-uuid',
                status: 'pending',
                amount: 2000,
                currency: '032',
            };

            mockService.findTransactionById.mockResolvedValue(mockTransaction);
            mockReq.params = { id: 'local-tx-uuid' };

            await handlers.getTransaction(mockReq, mockRes, mockNext);

            expect(mockService.findTransactionById).toHaveBeenCalledWith('local-tx-uuid');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    transactionId: 'local-tx-uuid',
                    orderUuid: 'getnet-uuid',
                    vendureOrderCode: 'ORD-001',
                    status: 'pending',
                    amount: 2000,
                    currency: '032',
                    createdAt: undefined,
                    updatedAt: undefined,
                    expiresAt: undefined,
                    approvedAt: undefined,
                    lastEvent: undefined,
                    isTerminal: undefined,
                    webhookEventCount: undefined,
                },
            });
        });

        it('should return 404 when transaction not found', async () => {
            mockService.findTransactionById.mockResolvedValue(null);
            mockReq.params = { id: 'non-existent-id' };

            await handlers.getTransaction(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Transaction not found',
            });
        });

        it('should return 400 when id is missing', async () => {
            mockReq.params = {};

            await handlers.getTransaction(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
});
