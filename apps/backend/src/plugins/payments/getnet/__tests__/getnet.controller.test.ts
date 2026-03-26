import { createGetnetHandlers } from '../getnet.controller';
import { GetnetService } from '../getnet.service';
import { CreateCheckoutDto } from '../getnet.types';

// Mock the GetnetService
jest.mock('../getnet.service');

// Mock console methods to keep test output clean
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('GetnetController', () => {
    let mockService: jest.Mocked<GetnetService>;
    let handlers: ReturnType<typeof createGetnetHandlers>;
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockService = {
            createOrder: jest.fn(),
            getOrderStatus: jest.fn(),
            processWebhook: jest.fn(),
        } as any;

        handlers = createGetnetHandlers(mockService);

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

        it('should create checkout successfully', async () => {
            const mockResponse = {
                orderUuid: 'getnet-uuid-123',
                checkoutUrl: 'https://checkout.getnet.com/pay/123',
                expiresAt: '2024-01-01T12:00:00Z',
            };

            mockService.createOrder.mockResolvedValue(mockResponse);
            mockReq.body = validCheckoutDto;

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockService.createOrder).toHaveBeenCalledWith(validCheckoutDto);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockResponse,
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

        it('should return 400 when items are missing', async () => {
            mockReq.body = {
                orderCode: 'ORD-001',
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing required field: items (must have at least one item)',
            });
        });

        it('should return 400 when items array is empty', async () => {
            mockReq.body = {
                orderCode: 'ORD-001',
                items: [],
            };

            await handlers.createCheckout(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
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
    });

    describe('getOrderStatus', () => {
        it('should return order status successfully', async () => {
            const mockResponse = {
                orderUuid: 'getnet-uuid-123',
                status: 'approved',
                createdAt: '2024-01-01T10:00:00Z',
            };

            mockService.getOrderStatus.mockResolvedValue(mockResponse);
            mockReq.params = { uuid: 'getnet-uuid-123' };

            await handlers.getOrderStatus(mockReq, mockRes, mockNext);

            expect(mockService.getOrderStatus).toHaveBeenCalledWith('getnet-uuid-123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockResponse,
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
    });

    describe('handleWebhook', () => {
        it('should process webhook successfully', async () => {
            mockService.processWebhook.mockReturnValue({
                success: true,
                message: 'Webhook processed',
            });

            mockReq.body = {
                event: 'payment.approved',
                orderUuid: 'getnet-uuid-123',
                status: 'approved',
            };

            await handlers.handleWebhook(mockReq, mockRes, mockNext);

            expect(mockService.processWebhook).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Webhook processed',
            });
        });

        it('should return 400 when webhook processing fails', async () => {
            mockService.processWebhook.mockReturnValue({
                success: false,
                message: 'Invalid payload',
            });

            mockReq.body = {
                event: 'payment.approved',
                orderUuid: '',
                status: 'approved',
            };

            await handlers.handleWebhook(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
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
});
