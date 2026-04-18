import { MigrationInterface, QueryRunner } from 'typeorm';

const FIX_COLUMN = 'customFields__fix_relational_custom_fields__';
const FIX_COMMENT = 'A work-around needed when only relational custom fields are defined on an entity';

export class DropProductVariantRelationalFixColumns1777000001000 implements MigrationInterface {
    name = 'DropProductVariantRelationalFixColumns1777000001000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.dropColumnIfExists(queryRunner, 'product_variant_translation', FIX_COLUMN);
        await this.dropColumnIfExists(queryRunner, 'product_variant', FIX_COLUMN);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.addColumnIfMissing(queryRunner, 'product_variant', FIX_COLUMN);
        await this.addColumnIfMissing(queryRunner, 'product_variant_translation', FIX_COLUMN);
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

    private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
        if (!(await this.columnExists(queryRunner, tableName, columnName))) {
            return;
        }
        await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    }

    private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
        if (await this.columnExists(queryRunner, tableName, columnName)) {
            return;
        }
        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            ADD COLUMN \`${columnName}\` TINYINT NULL COMMENT '${FIX_COMMENT}'
        `);
    }
}
