import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMockPaymentTransaction1706000000000 implements MigrationInterface {
    name = 'CreateMockPaymentTransaction1706000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`mock_payment_transaction\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`orderCode\` VARCHAR(255) NOT NULL,
                \`transactionCode\` VARCHAR(255) NOT NULL,
                \`status\` VARCHAR(255) NOT NULL DEFAULT 'created',
                \`expectedAmount\` INT NOT NULL,
                \`currencyCode\` VARCHAR(255) NOT NULL DEFAULT 'ARS',
                \`webhookPayload\` TEXT NULL,
                \`settledAt\` DATETIME NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_mock_payment_transaction_code\` (\`transactionCode\`),
                INDEX \`IDX_mock_payment_order_code\` (\`orderCode\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('[Migration] Created mock_payment_transaction table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`mock_payment_transaction\`
        `);

        console.log('[Migration] Dropped mock_payment_transaction table');
    }
}
