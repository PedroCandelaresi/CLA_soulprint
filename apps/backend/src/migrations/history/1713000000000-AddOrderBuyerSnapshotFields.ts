import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderBuyerSnapshotFields1713000000000 implements MigrationInterface {
    name = 'AddOrderBuyerSnapshotFields1713000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`order\`
            ADD COLUMN \`customFieldsBuyerfullname\` VARCHAR(255) NULL,
            ADD COLUMN \`customFieldsBuyeremail\` VARCHAR(255) NULL,
            ADD COLUMN \`customFieldsBuyerphone\` VARCHAR(255) NULL,
            ADD COLUMN \`customFieldsBuyerdocument\` VARCHAR(255) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`order\`
            DROP COLUMN \`customFieldsBuyerfullname\`,
            DROP COLUMN \`customFieldsBuyeremail\`,
            DROP COLUMN \`customFieldsBuyerphone\`,
            DROP COLUMN \`customFieldsBuyerdocument\`
        `);
    }
}
