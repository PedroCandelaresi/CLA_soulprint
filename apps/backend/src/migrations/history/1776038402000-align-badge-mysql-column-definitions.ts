import { MigrationInterface, QueryRunner } from 'typeorm';

const RELATIONAL_FIX_COMMENT =
    'A work-around needed when only relational custom fields are defined on an entity';
const FIX_COLUMN = 'customFields__fix_relational_custom_fields__';

export class AlignBadgeMysqlColumnDefinitions1776038402000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`product_translation\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL COMMENT '${RELATIONAL_FIX_COMMENT}'`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL COMMENT '${RELATIONAL_FIX_COMMENT}'`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product_variant_translation\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL COMMENT '${RELATIONAL_FIX_COMMENT}'`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product_variant\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL COMMENT '${RELATIONAL_FIX_COMMENT}'`,
        );
        await queryRunner.query(
            'ALTER TABLE `badge` CHANGE `enabled` `enabled` tinyint NOT NULL DEFAULT 1',
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`product_translation\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product_variant_translation\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`product_variant\` CHANGE \`${FIX_COLUMN}\` \`${FIX_COLUMN}\` tinyint NULL`,
        );
        await queryRunner.query(
            'ALTER TABLE `badge` CHANGE `enabled` `enabled` tinyint NOT NULL DEFAULT 1',
        );
    }
}
