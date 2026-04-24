import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodIconField1777400000000 implements MigrationInterface {
    name = 'AddPaymentMethodIconField1777400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const exists = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'payment_method'
              AND COLUMN_NAME = 'customFieldsIcon'
        `);
        if (Number(exists?.[0]?.count ?? 0) === 0) {
            await queryRunner.query(
                'ALTER TABLE `payment_method` ADD COLUMN `customFieldsIcon` VARCHAR(255) NULL',
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const exists = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'payment_method'
              AND COLUMN_NAME = 'customFieldsIcon'
        `);
        if (Number(exists?.[0]?.count ?? 0) > 0) {
            await queryRunner.query(
                'ALTER TABLE `payment_method` DROP COLUMN `customFieldsIcon`',
            );
        }
    }
}
