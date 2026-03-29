import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerDocumentNumberField1712000000000 implements MigrationInterface {
    name = 'AddCustomerDocumentNumberField1712000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`customer\`
            ADD COLUMN \`customFieldsDocumentnumber\` VARCHAR(255) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`customer\`
            DROP COLUMN \`customFieldsDocumentnumber\`
        `);
    }
}
