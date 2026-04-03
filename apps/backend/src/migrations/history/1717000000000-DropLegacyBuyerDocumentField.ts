import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyBuyerDocumentField1717000000000 implements MigrationInterface {
    name = 'DropLegacyBuyerDocumentField1717000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasLegacyColumn = await queryRunner.hasColumn('order', 'customFieldsBuyerdocument');
        if (!hasLegacyColumn) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP COLUMN \`customFieldsBuyerdocument\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasLegacyColumn = await queryRunner.hasColumn('order', 'customFieldsBuyerdocument');
        if (hasLegacyColumn) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD COLUMN \`customFieldsBuyerdocument\` VARCHAR(255) NULL
        `);
    }
}
