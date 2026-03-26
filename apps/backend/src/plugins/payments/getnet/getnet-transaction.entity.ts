import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * GetnetPaymentTransaction Entity
 * 
 * Stores the link between a Vendure order and a Getnet checkout session.
 * This entity enables:
 * - Tracking the state of each payment attempt
 * - Idempotent webhook processing
 * - Auditing payment lifecycle
 * 
 * Status Flow:
 * - pending → processing → approved (terminal success)
 * - pending → processing → rejected (terminal failure)
 * - pending → processing → cancelled (terminal failure)
 * - pending → processing → expired (terminal failure)
 */
@Entity('getnet_payment_transaction')
@Index(['providerOrderUuid'], { unique: true })
@Index(['vendureOrderCode'])
@Index(['status'])
@Index(['createdAt'])
export class GetnetPaymentTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * The internal Vendure order code (e.g., "ORD-00001")
     */
    @Column({ type: 'varchar', length: 255 })
    @Index()
    vendureOrderCode!: string;

    /**
     * The Getnet order UUID (from response.data.id)
     */
    @Column({ type: 'varchar', length: 255 })
    providerOrderUuid!: string;

    /**
     * The checkout URL to redirect the customer
     */
    @Column({ type: 'text', nullable: true })
    checkoutUrl?: string;

    /**
     * Payment status from Getnet
     * Possible values: pending, processing, approved, rejected, cancelled, expired
     */
    @Column({ type: 'varchar', length: 50, default: 'pending' })
    status!: GetnetPaymentStatus;

    /**
     * Payment amount in cents
     */
    @Column({ type: 'int' })
    amount!: number;

    /**
     * Currency code (e.g., "032" for ARS)
     */
    @Column({ type: 'varchar', length: 10, default: '032' })
    currency!: string;

    /**
     * Last event received from Getnet webhook
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    lastEvent?: string;

    /**
     * Timestamp of the last webhook event
     */
    @Column({ type: 'datetime', nullable: true })
    lastEventAt?: Date;

    /**
     * When the Getnet checkout link expires
     */
    @Column({ type: 'datetime', nullable: true })
    expiresAt?: Date;

    /**
     * When the payment was approved (if applicable)
     */
    @Column({ type: 'datetime', nullable: true })
    approvedAt?: Date;

    /**
     * Last raw webhook payload (for debugging/auditing, truncated if too large)
     */
    @Column({ type: 'text', nullable: true })
    lastWebhookPayload?: string;

    /**
     * Number of webhook events received
     */
    @Column({ type: 'int', default: 0 })
    webhookEventCount!: number;

    /**
     * Whether we've processed a terminal state (no more updates expected)
     */
    @Column({ type: 'boolean', default: false })
    isTerminal!: boolean;

    /**
     * Additional metadata (JSON string for flexibility)
     */
    @Column({ type: 'text', nullable: true })
    metadata?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

/**
 * Getnet payment statuses mapped to local statuses
 */
export type GetnetPaymentStatus = 
    | 'pending'      // Checkout created, awaiting payment
    | 'processing'  // Payment in progress
    | 'approved'    // Payment successful (terminal)
    | 'rejected'    // Payment declined (terminal)
    | 'cancelled'   // Payment cancelled by user (terminal)
    | 'expired';    // Checkout link expired (terminal)

/**
 * Terminal states - once reached, no more updates expected
 */
export const TERMINAL_STATUSES: GetnetPaymentStatus[] = ['approved', 'rejected', 'cancelled', 'expired'];

/**
 * Check if a status is terminal
 */
export function isTerminalStatus(status: GetnetPaymentStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}

/**
 * Map Getnet status to local status
 */
export function mapGetnetStatus(status: string): GetnetPaymentStatus {
    const statusMap: Record<string, GetnetPaymentStatus> = {
        'pending': 'pending',
        'created': 'pending',
        'processing': 'processing',
        'in_progress': 'processing',
        'approved': 'approved',
        'success': 'approved',
        'completed': 'approved',
        'rejected': 'rejected',
        'declined': 'rejected',
        'failed': 'rejected',
        'cancelled': 'cancelled',
        'canceled': 'cancelled',
        'expired': 'expired',
        'timeout': 'expired',
    };

    const normalizedStatus = status.toLowerCase().replace(/[_-]/g, '');
    
    // Try exact match first
    if (statusMap[status.toLowerCase()]) {
        return statusMap[status.toLowerCase()];
    }
    
    // Try normalized match
    for (const [key, value] of Object.entries(statusMap)) {
        if (normalizedStatus.includes(key)) {
            return value;
        }
    }
    
    // Default to processing for unknown statuses
    console.warn(`[getnet] Unknown status "${status}", defaulting to processing`);
    return 'processing';
}
