import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type MockPaymentStatus = 'created' | 'pending' | 'approved' | 'rejected' | 'settled';

@Entity('mock_payment_transaction')
export class MockPaymentTransaction extends VendureEntity {
    constructor(input?: DeepPartial<MockPaymentTransaction>) {
        super(input);
    }

    @Index('IDX_mock_payment_order_code')
    @Column()
    orderCode!: string;

    @Index('IDX_mock_payment_transaction_code', { unique: true })
    @Column()
    transactionCode!: string;

    @Column({ default: 'created' })
    status!: MockPaymentStatus;

    @Column('int')
    expectedAmount!: number; // centavos

    @Column({ default: 'ARS' })
    currencyCode!: string;

    @Column({ nullable: true, type: 'text' })
    webhookPayload!: string | null;

    @Column({ type: 'datetime', nullable: true })
    settledAt!: Date | null;

    @CreateDateColumn()
    override createdAt!: Date;

    @UpdateDateColumn()
    override updatedAt!: Date;
}
