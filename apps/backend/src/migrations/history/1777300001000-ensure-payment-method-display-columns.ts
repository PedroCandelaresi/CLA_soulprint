import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class EnsurePaymentMethodDisplayColumns1777300001000 implements MigrationInterface {
    name = 'EnsurePaymentMethodDisplayColumns1777300001000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.ensureSettingsTable(queryRunner);

        if (!(await this.tableExists(queryRunner, 'payment_method'))) {
            return;
        }

        await this.dropPaymentMethodColumnIfExists(queryRunner, 'customFieldsStorefrontsectiontitle');
        await this.dropPaymentMethodColumnIfExists(queryRunner, 'customFieldsStorefrontfootertext');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefronttitle', 'VARCHAR(255) NULL');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefrontcarddescription', 'LONGTEXT NULL');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefrontinstructionstitle', 'VARCHAR(255) NULL');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefrontinstructions', 'LONGTEXT NULL');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefrontbuttonlabel', 'VARCHAR(255) NULL');
        await this.ensurePaymentMethodColumn(queryRunner, 'customFieldsStorefronticon', 'VARCHAR(255) NULL');
    }

    public async down(): Promise<void> {
        // Intentionally no-op: this repair migration only aligns an already deployed schema.
    }

    private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
        const result = await queryRunner.query(
            `
                SELECT COUNT(*) AS count
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
            `,
            [tableName],
        );
        return Number(result?.[0]?.count ?? 0) > 0;
    }

    private async paymentMethodColumnExists(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(
            `
                SELECT COUNT(*) AS count
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'payment_method'
                  AND COLUMN_NAME = ?
            `,
            [columnName],
        );
        return Number(result?.[0]?.count ?? 0) > 0;
    }

    private async ensureSettingsTable(queryRunner: QueryRunner): Promise<void> {
        if (await this.tableExists(queryRunner, 'storefront_payment_settings')) {
            return;
        }

        await queryRunner.createTable(
            new Table({
                name: 'storefront_payment_settings',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
                    {
                        name: 'updatedAt',
                        type: 'datetime',
                        precision: 6,
                        default: 'CURRENT_TIMESTAMP(6)',
                        onUpdate: 'CURRENT_TIMESTAMP(6)',
                    },
                    { name: 'sectionTitle', type: 'varchar', length: '255', isNullable: true },
                    { name: 'footerText', type: 'longtext', isNullable: true },
                ],
            }),
        );
    }

    private async ensurePaymentMethodColumn(
        queryRunner: QueryRunner,
        columnName: string,
        definition: string,
    ): Promise<void> {
        if (!(await this.paymentMethodColumnExists(queryRunner, columnName))) {
            await queryRunner.query(`ALTER TABLE \`payment_method\` ADD COLUMN \`${columnName}\` ${definition}`);
        }
    }

    private async dropPaymentMethodColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
        if (await this.paymentMethodColumnExists(queryRunner, columnName)) {
            await queryRunner.query(`ALTER TABLE \`payment_method\` DROP COLUMN \`${columnName}\``);
        }
    }
}
