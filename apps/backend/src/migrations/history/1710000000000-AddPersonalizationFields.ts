import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalizationFields1710000000000 implements MigrationInterface {
    name = 'AddPersonalizationFields1710000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`product_variant\`
            ADD COLUMN \`customFieldsRequiresPersonalization\` TINYINT(1) NOT NULL DEFAULT 0
        `);

        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD COLUMN \`customFieldsPersonalizationRequired\` TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN \`customFieldsPersonalizationStatus\` VARCHAR(255) NOT NULL DEFAULT 'not-required',
            ADD COLUMN \`customFieldsPersonalizationAssetId\` INT NULL,
            ADD COLUMN \`customFieldsPersonalizationAssetPreviewUrl\` TEXT NULL,
            ADD COLUMN \`customFieldsPersonalizationOriginalFilename\` VARCHAR(255) NULL,
            ADD COLUMN \`customFieldsPersonalizationUploadedAt\` DATETIME NULL,
            ADD COLUMN \`customFieldsPersonalizationNotes\` TEXT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD INDEX \`IDX_order_personalization_asset\` (\`customFieldsPersonalizationAssetId\`)
        `);

        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD CONSTRAINT \`FK_order_personalization_asset\`
            FOREIGN KEY (\`customFieldsPersonalizationAssetId\`) REFERENCES \`asset\`(\`id\`)
            ON DELETE SET NULL
        `);

        console.log('[Migration] Added personalization fields to order/product_variant tables');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP FOREIGN KEY \`FK_order_personalization_asset\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP INDEX \`IDX_order_personalization_asset\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP COLUMN \`customFieldsPersonalizationRequired\`,
            DROP COLUMN \`customFieldsPersonalizationStatus\`,
            DROP COLUMN \`customFieldsPersonalizationAssetId\`,
            DROP COLUMN \`customFieldsPersonalizationAssetPreviewUrl\`,
            DROP COLUMN \`customFieldsPersonalizationOriginalFilename\`,
            DROP COLUMN \`customFieldsPersonalizationUploadedAt\`,
            DROP COLUMN \`customFieldsPersonalizationNotes\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`product_variant\`
            DROP COLUMN \`customFieldsRequiresPersonalization\`
        `);

        console.log('[Migration] Removed personalization fields from order/product_variant tables');
    }
}
