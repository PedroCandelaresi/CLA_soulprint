import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

@Entity()
export class BadgeTemplate extends VendureEntity {
    constructor(input?: DeepPartial<BadgeTemplate>) {
        super(input);
    }

    @Column({ length: 255 })
    name!: string;

    @Column({ type: 'text' })
    svgTemplate!: string;

    /**
     * JSON object of default substitution params for {{key}} placeholders in svgTemplate.
     * Stored as a JSON string. Badge-level templateParams override these defaults.
     */
    @Column({ type: 'text', nullable: true })
    defaultParams: string | null = null;
}
