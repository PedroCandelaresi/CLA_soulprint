import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const RELATIONAL_FIX_COMMENT =
    'A work-around needed when only relational custom fields are defined on an entity';
const FIX_COLUMN = 'customFields__fix_relational_custom_fields__';

export class FixBadgeRelationalCustomFieldsTranslations1776038401000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('product_translation', FIX_COLUMN))) {
            await queryRunner.addColumn(
                'product_translation',
                new TableColumn({
                    name: FIX_COLUMN,
                    type: 'tinyint',
                    width: 1,
                    isNullable: true,
                    comment: RELATIONAL_FIX_COMMENT,
                }),
            );
        }

        if (!(await queryRunner.hasColumn('product_variant_translation', FIX_COLUMN))) {
            await queryRunner.addColumn(
                'product_variant_translation',
                new TableColumn({
                    name: FIX_COLUMN,
                    type: 'tinyint',
                    width: 1,
                    isNullable: true,
                    comment: RELATIONAL_FIX_COMMENT,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('product_variant_translation', FIX_COLUMN)) {
            await queryRunner.dropColumn('product_variant_translation', FIX_COLUMN);
        }

        if (await queryRunner.hasColumn('product_translation', FIX_COLUMN)) {
            await queryRunner.dropColumn('product_translation', FIX_COLUMN);
        }
    }
}
