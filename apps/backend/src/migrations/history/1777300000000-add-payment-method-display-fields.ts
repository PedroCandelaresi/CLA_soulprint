import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddPaymentMethodDisplayFields1777300000000 implements MigrationInterface {
    name = 'AddPaymentMethodDisplayFields1777300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'payment_method'))) {
            return;
        }

        await this.ensureSettingsTable(queryRunner);
        await this.backfillSettingsFromLegacyPaymentMethodFields(queryRunner);
        await this.dropPaymentMethodColumnIfExists(queryRunner, 'customFieldsStorefrontsectiontitle');
        await this.dropPaymentMethodColumnIfExists(queryRunner, 'customFieldsStorefrontfootertext');
        await this.ensureColumn(queryRunner, 'customFieldsStorefronttitle', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefrontcarddescription', 'LONGTEXT NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefrontinstructionstitle', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefrontinstructions', 'LONGTEXT NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefrontbuttonlabel', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefronticon', 'VARCHAR(255) NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'payment_method'))) {
            return;
        }

        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefronticon');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontbuttonlabel');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontinstructions');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontinstructionstitle');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontcarddescription');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefronttitle');
        if (await this.tableExists(queryRunner, 'storefront_payment_settings')) {
            await queryRunner.dropTable('storefront_payment_settings');
        }
    }

    private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
        `);
        return Number(result?.[0]?.count ?? 0) > 0;
    }

    private async columnExists(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
        return this.paymentMethodColumnExists(queryRunner, columnName);
    }

    private async paymentMethodColumnExists(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'payment_method'
              AND COLUMN_NAME = '${columnName}'
        `);
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

    private async backfillSettingsFromLegacyPaymentMethodFields(queryRunner: QueryRunner): Promise<void> {
        const hasSectionTitle = await this.paymentMethodColumnExists(queryRunner, 'customFieldsStorefrontsectiontitle');
        const hasFooterText = await this.paymentMethodColumnExists(queryRunner, 'customFieldsStorefrontfootertext');
        if (!hasSectionTitle && !hasFooterText) {
            return;
        }

        const existingRows = await queryRunner.query('SELECT COUNT(*) AS count FROM `storefront_payment_settings`');
        if (Number(existingRows?.[0]?.count ?? 0) > 0) {
            return;
        }

        const sectionColumn = hasSectionTitle ? '`customFieldsStorefrontsectiontitle`' : 'NULL';
        const footerColumn = hasFooterText ? '`customFieldsStorefrontfootertext`' : 'NULL';
        const legacyRows = await queryRunner.query(`
            SELECT ${sectionColumn} AS sectionTitle, ${footerColumn} AS footerText
            FROM \`payment_method\`
            WHERE (${sectionColumn} IS NOT NULL AND ${sectionColumn} <> '')
               OR (${footerColumn} IS NOT NULL AND ${footerColumn} <> '')
            ORDER BY id ASC
            LIMIT 1
        `);
        const legacy = legacyRows?.[0];

        await queryRunner.query(
            'INSERT INTO `storefront_payment_settings` (`createdAt`, `updatedAt`, `sectionTitle`, `footerText`) VALUES (CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), ?, ?)',
            [legacy?.sectionTitle ?? null, legacy?.footerText ?? null],
        );
    }

    private async ensureColumn(
        queryRunner: QueryRunner,
        columnName: string,
        definition: string,
    ): Promise<void> {
        if (!(await this.columnExists(queryRunner, columnName))) {
            await queryRunner.query(`ALTER TABLE \`payment_method\` ADD COLUMN \`${columnName}\` ${definition}`);
        }
    }

    private async dropColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
        await this.dropPaymentMethodColumnIfExists(queryRunner, columnName);
    }

    private async dropPaymentMethodColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
        if (!(await this.paymentMethodColumnExists(queryRunner, columnName))) {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`payment_method\` DROP COLUMN \`${columnName}\``);
    }
}
