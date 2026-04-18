import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

const RELATIONAL_FIX_COMMENT =
    'A work-around needed when only relational custom fields are defined on an entity';

export class AddBadges1776038400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'badge',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'createdAt',
                        type: 'datetime',
                        precision: 6,
                        default: 'CURRENT_TIMESTAMP(6)',
                    },
                    {
                        name: 'updatedAt',
                        type: 'datetime',
                        precision: 6,
                        default: 'CURRENT_TIMESTAMP(6)',
                        onUpdate: 'CURRENT_TIMESTAMP(6)',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'code',
                        type: 'varchar',
                        length: '64',
                    },
                    {
                        name: 'enabled',
                        type: 'tinyint',
                        width: 1,
                        default: 1,
                    },
                    {
                        name: 'priority',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'backgroundColor',
                        type: 'varchar',
                        length: '64',
                        isNullable: true,
                    },
                    {
                        name: 'textColor',
                        type: 'varchar',
                        length: '64',
                        isNullable: true,
                    },
                    {
                        name: 'expiresAt',
                        type: 'datetime',
                        precision: 6,
                        isNullable: true,
                    },
                    {
                        name: 'featuredAssetId',
                        type: 'int',
                        isNullable: true,
                    },
                ],
                indices: [
                    {
                        columnNames: ['code'],
                        isUnique: true,
                    },
                    {
                        columnNames: ['featuredAssetId'],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['featuredAssetId'],
                        referencedTableName: 'asset',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    },
                ],
            }),
        );

        await queryRunner.addColumn(
            'product',
            new TableColumn({
                name: 'customFields__fix_relational_custom_fields__',
                type: 'tinyint',
                width: 1,
                isNullable: true,
                comment: RELATIONAL_FIX_COMMENT,
            }),
        );

        await queryRunner.addColumn(
            'product_translation',
            new TableColumn({
                name: 'customFields__fix_relational_custom_fields__',
                type: 'tinyint',
                width: 1,
                isNullable: true,
                comment: RELATIONAL_FIX_COMMENT,
            }),
        );

        await queryRunner.addColumn(
            'product_variant',
            new TableColumn({
                name: 'customFields__fix_relational_custom_fields__',
                type: 'tinyint',
                width: 1,
                isNullable: true,
                comment: RELATIONAL_FIX_COMMENT,
            }),
        );

        await queryRunner.addColumn(
            'product_variant_translation',
            new TableColumn({
                name: 'customFields__fix_relational_custom_fields__',
                type: 'tinyint',
                width: 1,
                isNullable: true,
                comment: RELATIONAL_FIX_COMMENT,
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'product_custom_fields_badges_badge',
                columns: [
                    {
                        name: 'productId',
                        type: 'int',
                        isPrimary: true,
                    },
                    {
                        name: 'badgeId',
                        type: 'int',
                        isPrimary: true,
                    },
                ],
                indices: [
                    {
                        columnNames: ['productId'],
                    },
                    {
                        columnNames: ['badgeId'],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['productId'],
                        referencedTableName: 'product',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        onUpdate: 'CASCADE',
                    },
                    {
                        columnNames: ['badgeId'],
                        referencedTableName: 'badge',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        onUpdate: 'CASCADE',
                    },
                ],
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'product_variant_custom_fields_badges_badge',
                columns: [
                    {
                        name: 'productVariantId',
                        type: 'int',
                        isPrimary: true,
                    },
                    {
                        name: 'badgeId',
                        type: 'int',
                        isPrimary: true,
                    },
                ],
                indices: [
                    {
                        columnNames: ['productVariantId'],
                    },
                    {
                        columnNames: ['badgeId'],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['productVariantId'],
                        referencedTableName: 'product_variant',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        onUpdate: 'CASCADE',
                    },
                    {
                        columnNames: ['badgeId'],
                        referencedTableName: 'badge',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        onUpdate: 'CASCADE',
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('product_variant_custom_fields_badges_badge');
        await queryRunner.dropTable('product_custom_fields_badges_badge');
        await queryRunner.dropColumn('product_variant_translation', 'customFields__fix_relational_custom_fields__');
        await queryRunner.dropColumn('product_variant', 'customFields__fix_relational_custom_fields__');
        await queryRunner.dropColumn('product_translation', 'customFields__fix_relational_custom_fields__');
        await queryRunner.dropColumn('product', 'customFields__fix_relational_custom_fields__');
        await queryRunner.dropTable('badge');
    }
}
