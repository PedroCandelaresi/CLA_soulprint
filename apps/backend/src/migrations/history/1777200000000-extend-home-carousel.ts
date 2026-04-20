import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class ExtendHomeCarousel1777200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('home_carousel_slide', [
            new TableColumn({ name: 'layout', type: 'varchar', length: '24', default: "'split_left'" }),
            new TableColumn({ name: 'textTheme', type: 'varchar', length: '8', default: "'dark'" }),
            new TableColumn({ name: 'badgeText', type: 'varchar', length: '80', isNullable: true }),
            new TableColumn({ name: 'badgeColor', type: 'varchar', length: '24', isNullable: true }),
            new TableColumn({ name: 'badgeVariant', type: 'varchar', length: '16', default: "'solid'" }),
        ]);

        await queryRunner.createTable(
            new Table({
                name: 'home_carousel_settings',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
                    {
                        name: 'updatedAt',
                        type: 'datetime',
                        precision: 6,
                        default: 'CURRENT_TIMESTAMP(6)',
                        onUpdate: 'CURRENT_TIMESTAMP(6)',
                    },
                    { name: 'transitionEffect', type: 'varchar', length: '16', default: "'fade'" },
                    { name: 'autoplayEnabled', type: 'tinyint', width: 1, default: 1 },
                    { name: 'autoplayInterval', type: 'int', default: 5500 },
                    { name: 'showArrows', type: 'tinyint', width: 1, default: 1 },
                    { name: 'showDots', type: 'tinyint', width: 1, default: 1 },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('home_carousel_settings');
        await queryRunner.dropColumns('home_carousel_slide', [
            'layout',
            'textTheme',
            'badgeText',
            'badgeColor',
            'badgeVariant',
        ]);
    }
}
