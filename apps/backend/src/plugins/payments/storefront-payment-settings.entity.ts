import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

@Entity()
export class StorefrontPaymentSettings extends VendureEntity {
    constructor(input?: DeepPartial<StorefrontPaymentSettings>) {
        super(input);
    }

    @Column({ type: 'varchar', length: 255, nullable: true })
    sectionTitle!: string | null;

    @Column({ type: 'longtext', nullable: true })
    footerText!: string | null;
}
