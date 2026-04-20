import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Asset, EntityId, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export type HomeCarouselLinkType = 'internal' | 'external';
export type HomeCarouselSlideLayout = 'split_left' | 'split_right' | 'full_image';
export type HomeCarouselBadgeVariant = 'solid' | 'outline' | 'pill';
export type HomeCarouselTextTheme = 'dark' | 'light';

@Entity()
export class HomeCarouselSlide extends VendureEntity {
    constructor(input?: DeepPartial<HomeCarouselSlide>) {
        super(input);
    }

    @Column({ length: 255 })
    title!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    subtitle: string | null = null;

    @Column({ type: 'text', nullable: true })
    description: string | null = null;

    @Column({ type: 'varchar', length: 160, nullable: true })
    primaryButtonText: string | null = null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    primaryButtonUrl: string | null = null;

    @Column({ type: 'varchar', length: 160, nullable: true })
    secondaryButtonText: string | null = null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    secondaryButtonUrl: string | null = null;

    @Column({ type: 'varchar', length: 16, default: 'internal' })
    linkType!: HomeCarouselLinkType;

    @Column({ type: 'boolean', default: false })
    openInNewTab = false;

    @Column({ type: 'boolean', default: true })
    @Index()
    isActive = true;

    @Column({ type: 'int', default: 0 })
    @Index()
    sortOrder = 0;

    @Column({ type: 'varchar', length: 255, nullable: true })
    altText: string | null = null;

    @Column({ type: 'varchar', length: 24, default: 'split_left' })
    layout!: HomeCarouselSlideLayout;

    @Column({ type: 'varchar', length: 8, default: 'dark' })
    textTheme!: HomeCarouselTextTheme;

    @Column({ type: 'varchar', length: 80, nullable: true })
    badgeText: string | null = null;

    @Column({ type: 'varchar', length: 24, nullable: true })
    badgeColor: string | null = null;

    @Column({ type: 'varchar', length: 16, default: 'solid' })
    badgeVariant!: HomeCarouselBadgeVariant;

    @Index()
    @ManyToOne(() => Asset, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'desktopAssetId' })
    desktopAsset: Asset | null = null;

    @EntityId({ nullable: true })
    desktopAssetId: ID | null = null;

    @Index()
    @ManyToOne(() => Asset, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'mobileAssetId' })
    mobileAsset: Asset | null = null;

    @EntityId({ nullable: true })
    mobileAssetId: ID | null = null;
}
