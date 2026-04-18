import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Asset, EntityId, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BadgeTemplate } from './badge-template.entity';

@Entity()
export class Badge extends VendureEntity {
    constructor(input?: DeepPartial<Badge>) {
        super(input);
    }

    @Column({ length: 255 })
    name!: string;

    @Index({ unique: true })
    @Column({ length: 64 })
    code!: string;

    @Column({ type: 'boolean', default: true })
    enabled = true;

    @Column({ type: 'int', default: 0 })
    priority = 0;

    @Column({ type: 'varchar', length: 64, nullable: true })
    backgroundColor: string | null = null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    textColor: string | null = null;

    @Column({ type: 'datetime', precision: 6, nullable: true })
    expiresAt: Date | null = null;

    @Index()
    @ManyToOne(() => Asset, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'featuredAssetId' })
    featuredAsset: Asset | null = null;

    @EntityId({ nullable: true })
    featuredAssetId: ID | null = null;

    @ManyToOne(() => BadgeTemplate, { eager: false, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'templateId' })
    template: BadgeTemplate | null = null;

    @EntityId({ nullable: true })
    templateId: ID | null = null;

    /**
     * JSON string of per-badge substitution params that override BadgeTemplate.defaultParams.
     */
    @Column({ type: 'text', nullable: true })
    templateParams: string | null = null;

    /**
     * Pre-rendered SVG string, re-computed whenever template or templateParams change.
     * Null when no template is assigned.
     */
    @Column({ type: 'mediumtext', nullable: true })
    renderedSvg: string | null = null;
}
