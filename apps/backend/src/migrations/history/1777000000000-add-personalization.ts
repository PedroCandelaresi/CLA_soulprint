import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Personalization plugin schema.
 *
 * Creates custom fields on:
 *   - Order                → overall personalization status (derived)
 *   - OrderLine            → per-line upload state + asset FK + metadata
 *   - ProductVariant       → flag marking variants that need customer uploads
 *
 * This consolidates the four CLA migrations 1710…/1711…/1715…/1716… into a
 * single forward-only migration that assumes a clean demo2 database.
 */
export class AddPersonalization1777000000000 implements MigrationInterface {
    name = 'AddPersonalization1777000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'order')) || !(await this.tableExists(queryRunner, 'order_line'))) {
            return;
        }

        await this.ensureColumn(
            queryRunner,
            'order',
            'customFieldsPersonalizationoverallstatus',
            "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
        );

        await this.ensureColumn(
            queryRunner,
            'order_line',
            'customFieldsPersonalizationstatus',
            "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
        );
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationassetid', 'INT NULL');
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationnotes', 'LONGTEXT NULL');
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationuploadedat', 'DATETIME(6) NULL');
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationapprovedat', 'DATETIME(6) NULL');
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationrejectedreason', 'VARCHAR(255) NULL');
        await this.ensureColumn(
            queryRunner,
            'order_line',
            'customFieldsPersonalizationsnapshotfilename',
            'VARCHAR(255) NULL',
        );

        await this.addForeignKeyIfMissing(
            queryRunner,
            'order_line',
            'FK_77f3beacbb6092907ae25f729d8',
            'customFieldsPersonalizationassetid',
        );

        if (await this.tableExists(queryRunner, 'product_variant')) {
            await this.ensureColumn(
                queryRunner,
                'product_variant',
                'customFieldsRequirespersonalization',
                'TINYINT NOT NULL DEFAULT 0',
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'order_line'))) {
            return;
        }
        await this.dropForeignKeyIfExists(queryRunner, 'order_line', 'FK_77f3beacbb6092907ae25f729d8');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationstatus');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationassetid');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationnotes');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationuploadedat');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationapprovedat');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationrejectedreason');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationsnapshotfilename');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationoverallstatus');
        await this.dropColumnIfExists(queryRunner, 'product_variant', 'customFieldsRequirespersonalization');
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

    private async columnExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
              AND COLUMN_NAME = '${columnName}'
        `);
        return Number(result?.[0]?.count ?? 0) > 0;
    }

    private async ensureColumn(
        queryRunner: QueryRunner,
        tableName: string,
        columnName: string,
        definition: string,
    ): Promise<void> {
        if (!(await this.columnExists(queryRunner, tableName, columnName))) {
            await queryRunner.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
        }
    }

    private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
        if (!(await this.columnExists(queryRunner, tableName, columnName))) {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    }

    private async dropForeignKeyIfExists(
        queryRunner: QueryRunner,
        tableName: string,
        foreignKeyName: string,
    ): Promise<void> {
        const existing = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = '${foreignKeyName}'
        `);
        if (existing.length === 0) return;
        await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${foreignKeyName}\``);
    }

    private async addForeignKeyIfMissing(
        queryRunner: QueryRunner,
        tableName: string,
        foreignKeyName: string,
        columnName: string,
    ): Promise<void> {
        if (!(await this.columnExists(queryRunner, tableName, columnName))) {
            return;
        }
        const existing = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = '${foreignKeyName}'
        `);
        if (existing.length > 0) return;
        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            ADD CONSTRAINT \`${foreignKeyName}\`
            FOREIGN KEY (\`${columnName}\`) REFERENCES \`asset\`(\`id\`)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
        `);
    }
}
