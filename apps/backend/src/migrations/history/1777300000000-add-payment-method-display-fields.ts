import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodDisplayFields1777300000000 implements MigrationInterface {
    name = 'AddPaymentMethodDisplayFields1777300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'payment_method'))) {
            return;
        }

        await this.ensureColumn(queryRunner, 'customFieldsStorefrontsectiontitle', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'customFieldsStorefrontfootertext', 'LONGTEXT NULL');
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
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontfootertext');
        await this.dropColumnIfExists(queryRunner, 'customFieldsStorefrontsectiontitle');
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
        const result = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'payment_method'
              AND COLUMN_NAME = '${columnName}'
        `);
        return Number(result?.[0]?.count ?? 0) > 0;
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
        if (!(await this.columnExists(queryRunner, columnName))) {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`payment_method\` DROP COLUMN \`${columnName}\``);
    }
}
