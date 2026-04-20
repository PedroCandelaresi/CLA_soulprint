import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddHomeCarouselSlides1777100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'home_carousel_slide',
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
                    { name: 'title', type: 'varchar', length: '255' },
                    { name: 'subtitle', type: 'varchar', length: '255', isNullable: true },
                    { name: 'description', type: 'text', isNullable: true },
                    { name: 'primaryButtonText', type: 'varchar', length: '160', isNullable: true },
                    { name: 'primaryButtonUrl', type: 'varchar', length: '512', isNullable: true },
                    { name: 'secondaryButtonText', type: 'varchar', length: '160', isNullable: true },
                    { name: 'secondaryButtonUrl', type: 'varchar', length: '512', isNullable: true },
                    { name: 'linkType', type: 'varchar', length: '16', default: "'internal'" },
                    { name: 'openInNewTab', type: 'tinyint', width: 1, default: 0 },
                    { name: 'isActive', type: 'tinyint', width: 1, default: 1 },
                    { name: 'sortOrder', type: 'int', default: 0 },
                    { name: 'altText', type: 'varchar', length: '255', isNullable: true },
                    { name: 'desktopAssetId', type: 'int', isNullable: true },
                    { name: 'mobileAssetId', type: 'int', isNullable: true },
                ],
                indices: [
                    { columnNames: ['isActive'] },
                    { columnNames: ['sortOrder'] },
                    { columnNames: ['desktopAssetId'] },
                    { columnNames: ['mobileAssetId'] },
                ],
                foreignKeys: [
                    {
                        columnNames: ['desktopAssetId'],
                        referencedTableName: 'asset',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    },
                    {
                        columnNames: ['mobileAssetId'],
                        referencedTableName: 'asset',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('home_carousel_slide');
    }
}
