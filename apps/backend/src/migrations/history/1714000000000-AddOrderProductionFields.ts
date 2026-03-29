import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderProductionFields1714000000000 implements MigrationInterface {
    name = 'AddOrderProductionFields1714000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD COLUMN \`customFieldsProductionstatus\` VARCHAR(255) NOT NULL DEFAULT 'not-started',
            ADD COLUMN \`customFieldsProductionupdatedat\` DATETIME(6) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP COLUMN \`customFieldsProductionupdatedat\`,
            DROP COLUMN \`customFieldsProductionstatus\`
        `);
    }
}
