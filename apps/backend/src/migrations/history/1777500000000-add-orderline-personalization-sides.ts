import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderlinePersonalizationSides1777500000000 implements MigrationInterface {
    name = 'AddOrderlinePersonalizationSides1777500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const cols: Array<{ name: string; def: string }> = [
            { name: 'customFieldsFrontMode',                   def: "VARCHAR(10) NOT NULL DEFAULT 'image'" },
            { name: 'customFieldsFrontText',                   def: 'LONGTEXT NULL' },
            { name: 'customFieldsBackMode',                    def: "VARCHAR(10) NOT NULL DEFAULT 'none'" },
            { name: 'customFieldsBackText',                    def: 'LONGTEXT NULL' },
            { name: 'customFieldsPersonalizationBackStatus',   def: "VARCHAR(50) NOT NULL DEFAULT 'not-required'" },
            { name: 'customFieldsPersonalizationBackUploadedAt',       def: 'DATETIME(6) NULL' },
            { name: 'customFieldsPersonalizationBackSnapshotFileName', def: 'VARCHAR(255) NULL' },
        ];

        for (const col of cols) {
            const exists = await this.columnExists(queryRunner, col.name);
            if (!exists) {
                await queryRunner.query(
                    `ALTER TABLE \`order_line\` ADD COLUMN \`${col.name}\` ${col.def}`,
                );
            }
        }

        // FK para personalizationBackAsset
        const fkCol = 'customFieldsPersonalizationBackAssetId';
        if (!(await this.columnExists(queryRunner, fkCol))) {
            await queryRunner.query(
                `ALTER TABLE \`order_line\` ADD COLUMN \`${fkCol}\` INT NULL`,
            );
            try {
                await queryRunner.query(
                    `ALTER TABLE \`order_line\` ADD CONSTRAINT \`FK_personalization_back_asset\`
                     FOREIGN KEY (\`${fkCol}\`) REFERENCES \`asset\`(\`id\`) ON DELETE SET NULL`,
                );
            } catch {
                // Si la FK ya existe o la tabla asset no tiene esa estructura, continuamos
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const cols = [
            'customFieldsFrontMode',
            'customFieldsFrontText',
            'customFieldsBackMode',
            'customFieldsBackText',
            'customFieldsPersonalizationBackStatus',
            'customFieldsPersonalizationBackUploadedAt',
            'customFieldsPersonalizationBackSnapshotFileName',
            'customFieldsPersonalizationBackAssetId',
        ];
        for (const col of cols) {
            if (await this.columnExists(queryRunner, col)) {
                await queryRunner.query(`ALTER TABLE \`order_line\` DROP COLUMN \`${col}\``);
            }
        }
    }

    private async columnExists(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'order_line'
              AND COLUMN_NAME = '${columnName}'
        `);
        return Number(result?.[0]?.cnt ?? 0) > 0;
    }
}
