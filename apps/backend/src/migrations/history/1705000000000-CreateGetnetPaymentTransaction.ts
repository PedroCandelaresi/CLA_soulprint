import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGetnetPaymentTransaction1705000000000 implements MigrationInterface {
    name = 'CreateGetnetPaymentTransaction1705000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`getnet_payment_transaction\` (
                \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
                \`vendureOrderCode\` VARCHAR(255) NOT NULL,
                \`providerOrderUuid\` VARCHAR(255) NOT NULL,
                \`checkoutUrl\` TEXT NULL,
                \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
                \`amount\` INT NOT NULL,
                \`currency\` VARCHAR(10) NOT NULL DEFAULT '032',
                \`lastEvent\` VARCHAR(100) NULL,
                \`lastEventAt\` DATETIME NULL,
                \`expiresAt\` DATETIME NULL,
                \`approvedAt\` DATETIME NULL,
                \`lastWebhookPayload\` TEXT NULL,
                \`webhookEventCount\` INT NOT NULL DEFAULT 0,
                \`isTerminal\` TINYINT(1) NOT NULL DEFAULT 0,
                \`metadata\` TEXT NULL,
                \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_getnet_provider_order\` (\`providerOrderUuid\`),
                INDEX \`IDX_getnet_vendure_order\` (\`vendureOrderCode\`),
                INDEX \`IDX_getnet_status\` (\`status\`),
                INDEX \`IDX_getnet_created\` (\`createdAt\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('[Migration] Created getnet_payment_transaction table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`getnet_payment_transaction\`
        `);
        
        console.log('[Migration] Dropped getnet_payment_transaction table');
    }
}
