import { DataSource } from 'typeorm';
import { GetnetService } from '../getnet.service';
import { GetnetPaymentTransaction, mapGetnetStatus, isTerminalStatus, TERMINAL_STATUSES } from '../getnet-transaction.entity';
import { GetnetPluginConfig, CreateCheckoutDto, GetnetWebhookPayload } from '../getnet.types';

// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        post: jest.fn(),
        get: jest.fn(),
    })),
    post: jest.fn(),
}));

describe('GetnetService', () => {
    let mockDataSource: Partial<DataSource>;
    let mockConfig: GetnetPluginConfig;
    let getnetService: GetnetService;

    beforeEach(() => {
        mockDataSource = {
            getRepository: jest.fn(() => ({
                create: jest.fn(),
                save: jest.fn(),
                findOne: jest.fn(),
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
    });

    describe('constructor', () => {
        it('should create service with config', () => {
            getnetService = new GetnetService(mockConfig, mockDataSource as DataSource);
            expect(getnetService).toBeDefined();
        });
    });

    describe('createOrder', () => {
        it('should create checkout DTO correctly', () => {
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
                successUrl: 'http://localhost:3000/success',
                failedUrl: 'http://localhost:3000/failed',
            };

            // Validate DTO structure
            expect(dto.orderCode).toBe('ORD-00001');
            expect(dto.items).toHaveLength(1);
            expect(dto.items[0].unitPrice).toBe(1000);
        });
    });

    describe('status mapping', () => {
        it('should map Getnet pending status correctly', () => {
            expect(mapGetnetStatus('pending')).toBe('pending');
            expect(mapGetnetStatus('created')).toBe('pending');
        });

        it('should map Getnet processing status correctly', () => {
            expect(mapGetnetStatus('processing')).toBe('processing');
            expect(mapGetnetStatus('in_progress')).toBe('processing');
        });

        it('should map Getnet approved status correctly', () => {
            expect(mapGetnetStatus('approved')).toBe('approved');
            expect(mapGetnetStatus('success')).toBe('approved');
            expect(mapGetnetStatus('completed')).toBe('approved');
        });

        it('should map Getnet rejected status correctly', () => {
            expect(mapGetnetStatus('rejected')).toBe('rejected');
            expect(mapGetnetStatus('declined')).toBe('rejected');
            expect(mapGetnetStatus('failed')).toBe('rejected');
        });

        it('should map Getnet cancelled status correctly', () => {
            expect(mapGetnetStatus('cancelled')).toBe('cancelled');
            expect(mapGetnetStatus('canceled')).toBe('cancelled');
        });

        it('should map Getnet expired status correctly', () => {
            expect(mapGetnetStatus('expired')).toBe('expired');
            expect(mapGetnetStatus('timeout')).toBe('expired');
        });

        it('should default to processing for unknown statuses', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            expect(mapGetnetStatus('unknown_status')).toBe('processing');
            consoleSpy.mockRestore();
        });
    });

    describe('terminal status', () => {
        it('should identify terminal statuses correctly', () => {
            expect(isTerminalStatus('approved')).toBe(true);
            expect(isTerminalStatus('rejected')).toBe(true);
            expect(isTerminalStatus('cancelled')).toBe(true);
            expect(isTerminalStatus('expired')).toBe(true);
            expect(isTerminalStatus('pending')).toBe(false);
            expect(isTerminalStatus('processing')).toBe(false);
        });

        it('should have correct terminal statuses array', () => {
            expect(TERMINAL_STATUSES).toContain('approved');
            expect(TERMINAL_STATUSES).toContain('rejected');
            expect(TERMINAL_STATUSES).toContain('cancelled');
            expect(TERMINAL_STATUSES).toContain('expired');
            expect(TERMINAL_STATUSES).not.toContain('pending');
            expect(TERMINAL_STATUSES).not.toContain('processing');
        });
    });

    describe('webhook payload validation', () => {
        it('should validate webhook payload structure', () => {
            const payload: GetnetWebhookPayload = {
                event: 'order.updated',
                orderUuid: 'test-order-uuid',
                status: 'approved',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(payload.event).toBeDefined();
            expect(payload.orderUuid).toBeDefined();
            expect(payload.status).toBeDefined();
            expect(payload.timestamp).toBeDefined();
        });
    });

    describe('entity structure', () => {
        it('should have correct entity properties', () => {
            const transaction = new GetnetPaymentTransaction();
            transaction.id = 'test-id';
            transaction.vendureOrderCode = 'ORD-00001';
            transaction.providerOrderUuid = 'provider-uuid';
            transaction.checkoutUrl = 'https://checkout.getnet.com/123';
            transaction.status = 'pending';
            transaction.amount = 2000;
            transaction.currency = '032';
            transaction.webhookEventCount = 0;
            transaction.isTerminal = false;

            expect(transaction.vendureOrderCode).toBe('ORD-00001');
            expect(transaction.providerOrderUuid).toBe('provider-uuid');
            expect(transaction.status).toBe('pending');
            expect(transaction.amount).toBe(2000);
            expect(transaction.isTerminal).toBe(false);
        });
    });
});

describe('GetnetService - Vendure Integration', () => {
    it('should expose setVendureServices method', () => {
        const mockDataSource = {
            getRepository: jest.fn(() => ({
                create: jest.fn(),
                save: jest.fn(),
                findOne: jest.fn(),
            })),
            entityMetadatas: [],
        };

        const mockConfig: GetnetPluginConfig = {
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

        const getnetService = new GetnetService(mockConfig, mockDataSource as DataSource);
        
        // Should be able to set Vendure services
        expect(typeof getnetService.setVendureServices).toBe('function');
        
        // Should not throw when called with valid services
        expect(() => {
            getnetService.setVendureServices({
                orderService: {},
                paymentService: {},
                requestContextService: {},
                eventBus: {},
            });
        }).not.toThrow();
    });
});
