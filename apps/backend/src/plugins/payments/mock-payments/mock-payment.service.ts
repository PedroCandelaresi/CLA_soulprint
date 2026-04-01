import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
    TransactionalConnection,
    OrderService,
    RequestContextService,
    isGraphQlErrorResult,
} from '@vendure/core';
import { MockPaymentTransaction, MockPaymentStatus } from './mock-payment.entity';

const LOG_PREFIX = '[mock-payment]';

@Injectable()
export class MockPaymentService {
    constructor(
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly requestContextService: RequestContextService,
    ) {}

    /**
     * Create a checkout session for a given order.
     * Validates the order is in ArrangingPayment state, checks no active pending
     * transaction already exists, then creates a new MockPaymentTransaction.
     */
    async createCheckout(orderCode: string): Promise<{
        transactionCode: string;
        checkoutUrl: string;
        amount: number;
        currencyCode: string;
    }> {
        console.log(`${LOG_PREFIX} createCheckout called for order: ${orderCode}`);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });

        // Find the Vendure order by code
        const order = await this.orderService.findOneByCode(ctx, orderCode);
        if (!order) {
            console.error(`${LOG_PREFIX} Order not found: ${orderCode}`);
            throw new Error(`Order not found: ${orderCode}`);
        }

        // Only allow checkout when order is ready for payment
        if (order.state !== 'ArrangingPayment') {
            console.error(
                `${LOG_PREFIX} Order ${orderCode} is in state "${order.state}", expected "ArrangingPayment"`,
            );
            throw new Error(
                `Order ${orderCode} must be in ArrangingPayment state (currently: ${order.state})`,
            );
        }

        const repo = this.connection.getRepository(ctx, MockPaymentTransaction);

        // Check for an existing active (non-terminal) transaction for this order
        const existingTransaction = await repo.findOne({
            where: { orderCode, status: 'pending' as MockPaymentStatus },
        });

        if (existingTransaction) {
            console.log(
                `${LOG_PREFIX} Returning existing pending transaction ${existingTransaction.transactionCode} for order ${orderCode}`,
            );
            return {
                transactionCode: existingTransaction.transactionCode,
                checkoutUrl: `/payments/mock/pay/${existingTransaction.transactionCode}`,
                amount: existingTransaction.expectedAmount,
                currencyCode: existingTransaction.currencyCode,
            };
        }

        const transactionCode = randomUUID();
        const expectedAmount = order.totalWithTax;
        const currencyCode = order.currencyCode?.toUpperCase() || 'ARS';

        const transaction = repo.create({
            orderCode,
            transactionCode,
            status: 'pending',
            expectedAmount,
            currencyCode,
            webhookPayload: null,
            settledAt: null,
        });

        await repo.save(transaction);

        console.log(
            `${LOG_PREFIX} Created transaction ${transactionCode} for order ${orderCode}, amount: ${expectedAmount} ${currencyCode}`,
        );

        return {
            transactionCode,
            checkoutUrl: `/payments/mock/pay/${transactionCode}`,
            amount: expectedAmount,
            currencyCode,
        };
    }

    /**
     * Confirm a payment as approved or rejected.
     * Handles idempotency: if already settled/rejected, returns current state without re-processing.
     * On approval: calls addManualPaymentToOrder and transitions order to PaymentSettled.
     * On rejection: marks transaction as rejected.
     */
    async confirmPayment(
        transactionCode: string,
        result: 'approved' | 'rejected',
    ): Promise<{ success: boolean; status: MockPaymentStatus; message: string }> {
        console.log(`${LOG_PREFIX} confirmPayment called: transactionCode=${transactionCode}, result=${result}`);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const repo = this.connection.getRepository(ctx, MockPaymentTransaction);

        const transaction = await repo.findOne({ where: { transactionCode } });
        if (!transaction) {
            console.error(`${LOG_PREFIX} Transaction not found: ${transactionCode}`);
            throw new Error(`Transaction not found: ${transactionCode}`);
        }

        // Idempotency: already in a terminal state
        if (transaction.status === 'settled' || transaction.status === 'rejected') {
            console.log(
                `${LOG_PREFIX} Transaction ${transactionCode} already in terminal state "${transaction.status}", skipping`,
            );
            return {
                success: true,
                status: transaction.status,
                message: `Transaction already ${transaction.status} (idempotent)`,
            };
        }

        // Find the order to validate amount
        const order = await this.orderService.findOneByCode(ctx, transaction.orderCode);
        if (!order) {
            console.error(`${LOG_PREFIX} Order not found for transaction: ${transaction.orderCode}`);
            throw new Error(`Order not found: ${transaction.orderCode}`);
        }

        // Validate amount against fresh order total
        if (order.totalWithTax !== transaction.expectedAmount) {
            console.warn(
                `${LOG_PREFIX} Amount mismatch for transaction ${transactionCode}: expected ${transaction.expectedAmount}, order total is ${order.totalWithTax}`,
            );
            // Non-fatal warning — proceed but log it
        }

        if (result === 'rejected') {
            transaction.status = 'rejected';
            transaction.webhookPayload = JSON.stringify({ result: 'rejected', confirmedAt: new Date().toISOString() });
            await repo.save(transaction);

            console.log(`${LOG_PREFIX} Transaction ${transactionCode} marked as rejected`);
            return { success: true, status: 'rejected', message: 'Payment rejected' };
        }

        // result === 'approved'
        console.log(`${LOG_PREFIX} Processing approval for transaction ${transactionCode}, order ${transaction.orderCode}`);

        // Add manual payment to the Vendure order
        const paymentResult = await this.orderService.addManualPaymentToOrder(ctx, {
            orderId: order.id,
            method: 'mock-payment',
            transactionId: transactionCode,
            metadata: { provider: 'mock' },
        });

        if (isGraphQlErrorResult(paymentResult)) {
            const errorMessage = (paymentResult as any).message || 'Unknown payment error';
            console.error(`${LOG_PREFIX} addManualPaymentToOrder failed [${(paymentResult as any).__typename}]: ${errorMessage}`);
            throw new Error(`Failed to add manual payment: ${errorMessage}`);
        }

        console.log(`${LOG_PREFIX} Manual payment added to order ${transaction.orderCode}`);

        // Transition order to PaymentSettled
        try {
            await this.orderService.transitionToState(ctx, order.id, 'PaymentSettled');
            console.log(`${LOG_PREFIX} Order ${transaction.orderCode} transitioned to PaymentSettled`);
        } catch (stateError: any) {
            // Order might already be in PaymentSettled or the transition is not available
            console.warn(
                `${LOG_PREFIX} Could not transition order ${transaction.orderCode} to PaymentSettled: ${stateError.message}`,
            );
        }

        transaction.status = 'settled';
        transaction.settledAt = new Date();
        transaction.webhookPayload = JSON.stringify({
            result: 'approved',
            settledAt: transaction.settledAt.toISOString(),
        });
        await repo.save(transaction);

        console.log(`${LOG_PREFIX} Transaction ${transactionCode} settled successfully`);
        return { success: true, status: 'settled', message: 'Payment approved and settled' };
    }

    /**
     * Retrieve a transaction by its transaction code.
     * Returns null if not found.
     */
    async getTransaction(transactionCode: string): Promise<MockPaymentTransaction | null> {
        console.log(`${LOG_PREFIX} getTransaction called: ${transactionCode}`);

        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const repo = this.connection.getRepository(ctx, MockPaymentTransaction);

        const transaction = await repo.findOne({ where: { transactionCode } });

        if (!transaction) {
            console.log(`${LOG_PREFIX} Transaction not found: ${transactionCode}`);
            return null;
        }

        return transaction;
    }
}
