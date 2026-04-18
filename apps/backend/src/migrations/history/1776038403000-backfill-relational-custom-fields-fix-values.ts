import { MigrationInterface, QueryRunner } from 'typeorm';

const FIX_COLUMN = 'customFields__fix_relational_custom_fields__';

export class BackfillRelationalCustomFieldsFixValues1776038403000
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE \`product\` SET \`${FIX_COLUMN}\` = 0 WHERE \`${FIX_COLUMN}\` IS NULL`,
        );
        await queryRunner.query(
            `UPDATE \`product_translation\` SET \`${FIX_COLUMN}\` = 0 WHERE \`${FIX_COLUMN}\` IS NULL`,
        );
        await queryRunner.query(
            `UPDATE \`product_variant\` SET \`${FIX_COLUMN}\` = 0 WHERE \`${FIX_COLUMN}\` IS NULL`,
        );
        await queryRunner.query(
            `UPDATE \`product_variant_translation\` SET \`${FIX_COLUMN}\` = 0 WHERE \`${FIX_COLUMN}\` IS NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE \`product_variant_translation\` SET \`${FIX_COLUMN}\` = NULL WHERE \`${FIX_COLUMN}\` = 0`,
        );
        await queryRunner.query(
            `UPDATE \`product_variant\` SET \`${FIX_COLUMN}\` = NULL WHERE \`${FIX_COLUMN}\` = 0`,
        );
        await queryRunner.query(
            `UPDATE \`product_translation\` SET \`${FIX_COLUMN}\` = NULL WHERE \`${FIX_COLUMN}\` = 0`,
        );
        await queryRunner.query(
            `UPDATE \`product\` SET \`${FIX_COLUMN}\` = NULL WHERE \`${FIX_COLUMN}\` = 0`,
        );
    }
}
