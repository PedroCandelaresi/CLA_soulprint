import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

export type HomeCarouselTransitionEffect = 'fade' | 'slide' | 'zoom';

@Entity()
export class HomeCarouselSettings extends VendureEntity {
    constructor(input?: DeepPartial<HomeCarouselSettings>) {
        super(input);
    }

    @Column({ type: 'varchar', length: 16, default: 'fade' })
    transitionEffect!: HomeCarouselTransitionEffect;

    @Column({ type: 'boolean', default: true })
    autoplayEnabled = true;

    @Column({ type: 'int', default: 5500 })
    autoplayInterval = 5500;

    @Column({ type: 'boolean', default: true })
    showArrows = true;

    @Column({ type: 'boolean', default: true })
    showDots = true;
}
