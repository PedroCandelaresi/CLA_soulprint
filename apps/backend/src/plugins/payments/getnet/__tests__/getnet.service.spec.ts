import { GetnetService } from '../getnet.service';
import { GetnetPaymentTransaction, GetnetPaymentStatus, mapGetnetStatus, isTerminalStatus, TERMINAL_STATUSES } from '../getnet-transaction.entity';
import { GetnetPluginConfig, CreateCheckoutDto, GetnetWebhookPayload, CheckoutResponse, OrderStatusResponse } from '../getnet.types';

// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        post: jest.fn(),
        get: jest.fn(),
    })),
    post: jest.fn(),
}));

// Mock console to keep test output clean
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('GetnetService', () => {
    let mockDataSource: any;
    let mockConfig: GetnetPluginConfig;

    beforeEach(() => {
        mockDataSource = {
            getRepository: jest.fn(() => ({
                create: jest.fn(),
                save: jest.fn(),
                findOne: jest.fn(),
                findOneBy: jest.fn(),
            })),
            entityMetadatas: [],
        };

        mockConfig = {
            authBaseUrl: 'https://auth.preprod.geopagos.com',
            checkoutBaseUrl: 'https://api-santander.preprod.geopagos.com',
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
            scope: '*',
            currency: '032',
            successUrl: 'http://localhost:3000/checkout/success',
            failedUrl: 'http://localhost:3000/checkout/failed',
            expireLimitMinutes: 10,
            requestTimeout: 30000,
        };

        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create service instance with valid config', () => {
            const service = new GetnetService(mockConfig, mockDataSource);
            expect(service).toBeDefined();
        });

        it('should expose setVendureServices method', () => {
            const service = new GetnetService(mockConfig, mockDataSource);
            expect(typeof service.setVendureServices).toBe('function');
        });

        it('should accept empty services without throwing', () => {
            const service = new GetnetService(mockConfig, mockDataSource);
            expect(() => {
                service.setVendureServices({
                    orderService: {} as any,
                    paymentService: {} as any,
                    requestContextService: {} as any,
                });
            }).not.toThrow();
        });
    });

    describe('CreateCheckoutDto validation', () => {
        it('should have correct structure for valid DTO', () => {
            const dto: CreateCheckoutDto = {
                orderCode: 'ORD-00001',
                items: [
                    {
                        id: 'item-1',
                        name: 'Test Product',
                        quantity: 2,
                        unitPrice: 1000, // 10.00 ARS in cents
                    },
                ],
                shippingCost: 500,
                customerEmail: 'test@example.com',
                successUrl: 'http://localhost:3000/success',
                failedUrl: 'http://localhost:3000/failed',
            };

            expect(dto.orderCode).toBe('ORD-00001');
            expect(dto.items).toHaveLength(1);
            expect(dto.items?.[0].unitPrice).toBe(1000);
            expect(dto.shippingCost).toBe(500);
        });
    });

    describe('CheckoutResponse structure', () => {
        it('should have all required fields', () => {
            const response: CheckoutResponse = {
                mode: 'real',
                status: 'pending',
                checkoutId: 'getnet-uuid',
                transactionId: 'local-uuid',
                orderUuid: 'getnet-uuid',
                processUrl: 'https://checkout.getnet.com/123',
                checkoutUrl: 'https://checkout.getnet.com/123',
                vendureOrderCode: 'ORD-00001',
                expiresAt: '2024-01-01T12:00:00Z',
                rawResponse: {
                    status: 'pending',
                    createdAt: '2024-01-01T10:00:00Z',
                },
            };

            expect(response.transactionId).toBeDefined();
            expect(response.orderUuid).toBeDefined();
            expect(response.checkoutUrl).toBeDefined();
            expect(response.vendureOrderCode).toBeDefined();
        });
    });

    describe('OrderStatusResponse structure', () => {
        it('should have all required fields', () => {
            const response: OrderStatusResponse = {
                transactionId: 'local-uuid',
                orderUuid: 'getnet-uuid',
                vendureOrderCode: 'ORD-00001',
                status: 'approved',
                providerStatus: 'approved',
                createdAt: '2024-01-01T10:00:00Z',
                updatedAt: '2024-01-01T10:05:00Z',
                expiresAt: '2024-01-01T12:00:00Z',
                approvedAt: '2024-01-01T10:05:00Z',
                isTerminal: true,
                webhookEventCount: 2,
            };

            expect(response.transactionId).toBeDefined();
            expect(response.orderUuid).toBeDefined();
            expect(response.vendureOrderCode).toBeDefined();
            expect(response.status).toBeDefined();
            expect(response.isTerminal).toBeDefined();
            expect(response.webhookEventCount).toBeDefined();
            expect(response.createdAt).toBeDefined();
        });
    });

    describe('GetnetWebhookPayload structure', () => {
        it('should have all required fields including orderId', () => {
            const payload: GetnetWebhookPayload = {
                event: 'order.updated',
                orderUuid: 'getnet-uuid-123',
                orderId: 'getnet-uuid-123', // Required field
                status: 'approved',
                timestamp: '2024-01-01T00:00:00Z',
                metadata: {
                    key: 'value',
                },
            };

            expect(payload.event).toBeDefined();
            expect(payload.orderUuid).toBeDefined();
            expect(payload.orderId).toBeDefined(); // orderId is REQUIRED
            expect(payload.status).toBeDefined();
            expect(payload.timestamp).toBeDefined();
        });

        it('should allow optional metadata', () => {
            const payload: GetnetWebhookPayload = {
                event: 'order.updated',
                orderUuid: 'getnet-uuid-123',
                orderId: 'getnet-uuid-123',
                status: 'pending',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(payload.metadata).toBeUndefined();
        });
    });
});

describe('Status Mapping Functions', () => {
    describe('mapGetnetStatus', () => {
        it('should map pending statuses correctly', () => {
            expect(mapGetnetStatus('pending')).toBe('pending');
            expect(mapGetnetStatus('created')).toBe('pending');
        });

        it('should map processing statuses correctly', () => {
            expect(mapGetnetStatus('processing')).toBe('processing');
            expect(mapGetnetStatus('in_progress')).toBe('processing');
        });

        it('should map approved statuses correctly', () => {
            expect(mapGetnetStatus('approved')).toBe('approved');
            expect(mapGetnetStatus('success')).toBe('approved');
            expect(mapGetnetStatus('completed')).toBe('approved');
        });

        it('should map rejected statuses correctly', () => {
            expect(mapGetnetStatus('rejected')).toBe('rejected');
            expect(mapGetnetStatus('declined')).toBe('rejected');
            expect(mapGetnetStatus('failed')).toBe('rejected');
        });

        it('should map cancelled statuses correctly', () => {
            expect(mapGetnetStatus('cancelled')).toBe('cancelled');
            expect(mapGetnetStatus('canceled')).toBe('cancelled');
        });

        it('should map expired statuses correctly', () => {
            expect(mapGetnetStatus('expired')).toBe('expired');
            expect(mapGetnetStatus('timeout')).toBe('expired');
        });

        it('should default to processing for unknown statuses', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            expect(mapGetnetStatus('unknown_status')).toBe('processing');
            expect(mapGetnetStatus('random')).toBe('processing');
            consoleSpy.mockRestore();
        });
    });

    describe('isTerminalStatus', () => {
        it('should return true for terminal statuses', () => {
            expect(isTerminalStatus('approved')).toBe(true);
            expect(isTerminalStatus('rejected')).toBe(true);
            expect(isTerminalStatus('cancelled')).toBe(true);
            expect(isTerminalStatus('expired')).toBe(true);
        });

        it('should return false for non-terminal statuses', () => {
            expect(isTerminalStatus('pending')).toBe(false);
            expect(isTerminalStatus('processing')).toBe(false);
        });
    });

    describe('TERMINAL_STATUSES constant', () => {
        it('should contain only terminal statuses', () => {
            expect(TERMINAL_STATUSES).toContain('approved');
            expect(TERMINAL_STATUSES).toContain('rejected');
            expect(TERMINAL_STATUSES).toContain('cancelled');
            expect(TERMINAL_STATUSES).toContain('expired');
        });

        it('should not contain non-terminal statuses', () => {
            expect(TERMINAL_STATUSES).not.toContain('pending');
            expect(TERMINAL_STATUSES).not.toContain('processing');
        });

        it('should have exactly 4 terminal statuses', () => {
            expect(TERMINAL_STATUSES).toHaveLength(4);
        });
    });
});

describe('GetnetPaymentStatus Type', () => {
    it('should allow all valid status values', () => {
        const statuses: GetnetPaymentStatus[] = [
            'pending',
            'processing',
            'approved',
            'rejected',
            'cancelled',
            'expired',
        ];

        statuses.forEach(status => {
            const mapped = mapGetnetStatus(status);
            expect(['pending', 'processing', 'approved', 'rejected', 'cancelled', 'expired']).toContain(mapped);
        });
    });
});

describe('GetnetPaymentTransaction Entity', () => {
    it('should have status as undefined initially (DB will set default)', () => {
        const transaction = new GetnetPaymentTransaction();

        // Status is not set until explicitly assigned or DB default
        expect(transaction.status).toBeUndefined();
        // These are DB-level defaults, not TypeScript class defaults
        // The actual values depend on TypeORM column decorators
    });

    it('should accept all status values', () => {
        const statuses: GetnetPaymentStatus[] = [
            'pending',
            'processing',
            'approved',
            'rejected',
            'cancelled',
            'expired',
        ];

        const transaction = new GetnetPaymentTransaction();

        statuses.forEach(status => {
            transaction.status = status;
            expect(transaction.status).toBe(status);
        });
    });

    it('should allow setting all entity properties', () => {
        const transaction = new GetnetPaymentTransaction();
        
        transaction.id = 'test-id';
        transaction.vendureOrderCode = 'ORD-001';
        transaction.providerOrderUuid = 'getnet-uuid';
        transaction.checkoutUrl = 'https://checkout.getnet.com/123';
        transaction.status = 'pending';
        transaction.amount = 2000;
        transaction.currency = '032';
        transaction.webhookEventCount = 0;
        transaction.isTerminal = false;

        expect(transaction.id).toBe('test-id');
        expect(transaction.vendureOrderCode).toBe('ORD-001');
        expect(transaction.providerOrderUuid).toBe('getnet-uuid');
        expect(transaction.status).toBe('pending');
        expect(transaction.amount).toBe(2000);
        expect(transaction.currency).toBe('032');
    });
});
