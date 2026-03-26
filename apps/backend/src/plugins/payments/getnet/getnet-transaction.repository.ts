import { DataSource, Repository } from 'typeorm';
import { GetnetPaymentTransaction, GetnetPaymentStatus } from './getnet-transaction.entity';

/**
 * Repository for GetnetPaymentTransaction
 * Handles all database operations for Getnet payment transactions
 */
export class GetnetTransactionRepository {
    private repository!: Repository<GetnetPaymentTransaction>;

    constructor(private dataSource: DataSource) {
        this.repository = this.dataSource.getRepository(GetnetPaymentTransaction);
    }

    /**
     * Create a new transaction record
     */
    async create(data: {
        vendureOrderCode: string;
        providerOrderUuid: string;
        checkoutUrl?: string;
        amount: number;
        currency: string;
        expiresAt?: Date;
        metadata?: string;
    }): Promise<GetnetPaymentTransaction> {
        const transaction = this.repository.create({
            ...data,
            status: 'pending',
            webhookEventCount: 0,
            isTerminal: false,
        });

        const saved = await this.repository.save(transaction);
        console.log(`[getnet:repo] Created transaction: ${saved.id} for order ${data.vendureOrderCode}`);
        return saved;
    }

    /**
     * Find transaction by internal ID
     */
    async findById(id: string): Promise<GetnetPaymentTransaction | null> {
        return this.repository.findOne({ where: { id } });
    }

    /**
     * Find transaction by Getnet order UUID
     */
    async findByProviderOrderUuid(providerOrderUuid: string): Promise<GetnetPaymentTransaction | null> {
        return this.repository.findOne({ where: { providerOrderUuid } });
    }

    /**
     * Find transaction by Vendure order code
     */
    async findByVendureOrderCode(vendureOrderCode: string): Promise<GetnetPaymentTransaction | null> {
        // Order by createdAt DESC to get the most recent
        return this.repository.findOne({
            where: { vendureOrderCode },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Find all transactions for a Vendure order code
     */
    async findAllByVendureOrderCode(vendureOrderCode: string): Promise<GetnetPaymentTransaction[]> {
        return this.repository.find({
            where: { vendureOrderCode },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Find pending transactions (for retry/sync)
     */
    async findPendingTransactions(): Promise<GetnetPaymentTransaction[]> {
        return this.repository.find({
            where: { isTerminal: false },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Update transaction status with webhook data
     * Returns the updated transaction, or null if already processed this event
     */
    async updateFromWebhook(
        providerOrderUuid: string,
        status: GetnetPaymentStatus,
        event: string,
        webhookPayload: unknown
    ): Promise<{ transaction: GetnetPaymentTransaction; isIdempotent: boolean } | null> {
        const transaction = await this.findByProviderOrderUuid(providerOrderUuid);
        
        if (!transaction) {
            console.warn(`[getnet:repo] Transaction not found for providerOrderUuid: ${providerOrderUuid}`);
            return null;
        }

        // Idempotency check: Don't process if we're already in a terminal state
        if (transaction.isTerminal) {
            console.log(`[getnet:repo] Transaction ${transaction.id} already in terminal state (${transaction.status}), skipping duplicate event: ${event}`);
            return { transaction, isIdempotent: true };
        }

        // Idempotency check: If same event was already processed at the same time
        if (transaction.lastEvent === event && transaction.lastEventAt) {
            const timeDiff = Math.abs(Date.now() - transaction.lastEventAt.getTime());
            if (timeDiff < 5000) { // Within 5 seconds, likely duplicate
                console.log(`[getnet:repo] Duplicate event detected for transaction ${transaction.id}: ${event}`);
                return { transaction, isIdempotent: true };
            }
        }

        // Update the transaction
        const previousStatus = transaction.status;
        transaction.status = status;
        transaction.lastEvent = event;
        transaction.lastEventAt = new Date();
        transaction.webhookEventCount = transaction.webhookEventCount + 1;
        
        // Store truncated webhook payload for debugging (max 10KB)
        const payloadStr = JSON.stringify(webhookPayload);
        transaction.lastWebhookPayload = payloadStr.length > 10240 
            ? payloadStr.substring(0, 10240) + '...[truncated]'
            : payloadStr;

        // Check if this is a terminal state
        const terminalStatuses: GetnetPaymentStatus[] = ['approved', 'rejected', 'cancelled', 'expired'];
        if (terminalStatuses.includes(status)) {
            transaction.isTerminal = true;
            if (status === 'approved') {
                transaction.approvedAt = new Date();
            }
        }

        const saved = await this.repository.save(transaction);
        
        console.log(`[getnet:repo] Transaction ${saved.id} updated: ${previousStatus} → ${status} (event: ${event})`);
        
        return { transaction: saved, isIdempotent: false };
    }

    /**
     * Update checkout URL after it's generated
     */
    async updateCheckoutUrl(id: string, checkoutUrl: string, expiresAt?: Date): Promise<GetnetPaymentTransaction | null> {
        const transaction = await this.findById(id);
        if (!transaction) {
            return null;
        }

        transaction.checkoutUrl = checkoutUrl;
        if (expiresAt) {
            transaction.expiresAt = expiresAt;
        }

        return this.repository.save(transaction);
    }

    /**
     * Mark transaction as processing
     */
    async markAsProcessing(id: string): Promise<GetnetPaymentTransaction | null> {
        const transaction = await this.findById(id);
        if (!transaction) {
            return null;
        }

        transaction.status = 'processing';
        return this.repository.save(transaction);
    }

    /**
     * Get transaction statistics
     */
    async getStats(): Promise<{
        total: number;
        pending: number;
        processing: number;
        approved: number;
        rejected: number;
        expired: number;
    }> {
        const [all, pending, processing, approved, rejected, expired] = await Promise.all([
            this.repository.count(),
            this.repository.count({ where: { status: 'pending' as any } }),
            this.repository.count({ where: { status: 'processing' as any } }),
            this.repository.count({ where: { status: 'approved' as any } }),
            this.repository.count({ where: { status: 'rejected' as any } }),
            this.repository.count({ where: { status: 'expired' as any } }),
        ]);

        return { total: all, pending, processing, approved, rejected, expired };
    }
}
