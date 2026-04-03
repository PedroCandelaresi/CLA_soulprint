import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: PersonalizationToOrderLine
 *
 * This project stores Vendure custom fields inline on `order` and `order_line`,
 * not in `order_custom_fields` / `order_line_custom_fields` tables.
 *
 * Goals:
 * - Move order-level personalization data to order-line custom fields
 * - Add provider-agnostic shipping snapshot fields on Order
 * - Keep a derived global personalization state on Order for admin/ops
 * - Tolerate partially-applied or legacy schemas
 */
export class PersonalizationToOrderLine1715000000000 implements MigrationInterface {
    name = 'PersonalizationToOrderLine1715000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'order')) || !(await this.tableExists(queryRunner, 'order_line'))) {
            return;
        }

        const variantRequiresPersonalizationColumn = await this.getFirstExistingColumn(
            queryRunner,
            'product_variant',
            ['customFieldsRequirespersonalization', 'customFieldsRequiresPersonalization'],
        );

        await this.dropForeignKeyIfExists(queryRunner, 'order', 'FK_order_personalization_asset');
        await this.dropForeignKeyIfExists(queryRunner, 'order', 'FK_36294c60e9ec3e790638c17d410');
        await this.dropIndexIfExists(queryRunner, 'order', 'IDX_order_personalization_asset');

        await this.ensureColumn(
            queryRunner,
            'order',
            'customFieldsPersonalizationoverallstatus',
            "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
        );
        await this.ensureColumn(queryRunner, 'order', 'customFieldsShippingquotecode', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsShippingmethodlabel', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsShippingpricecents', 'INT NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsShippingsnapshotjson', 'LONGTEXT NULL');

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
        await this.ensureColumn(queryRunner, 'order_line', 'customFieldsPersonalizationsnapshotfilename', 'VARCHAR(255) NULL');

        if (variantRequiresPersonalizationColumn) {
            await queryRunner.query(`
                UPDATE \`order_line\` ol
                INNER JOIN (
                    SELECT
                        COALESCE(requiredLine.lineId, firstLine.lineId) AS lineId,
                        COALESCE(o.\`customFieldsPersonalizationrequired\`, 0) AS legacyRequired,
                        o.\`customFieldsPersonalizationstatus\` AS legacyStatus,
                        o.\`customFieldsPersonalizationassetid\` AS legacyAssetId,
                        o.\`customFieldsPersonalizationnotes\` AS legacyNotes,
                        o.\`customFieldsPersonalizationuploadedat\` AS legacyUploadedAt,
                        o.\`customFieldsPersonalizationoriginalfilename\` AS legacyOriginalFileName,
                        CASE WHEN requiredLine.lineId IS NOT NULL THEN 1 ELSE 0 END AS required
                    FROM \`order\` o
                    INNER JOIN (
                        SELECT orderId, MIN(id) AS lineId
                        FROM \`order_line\`
                        GROUP BY orderId
                    ) firstLine ON firstLine.orderId = o.id
                    LEFT JOIN (
                        SELECT ol.orderId, MIN(ol.id) AS lineId
                        FROM \`order_line\` ol
                        INNER JOIN \`product_variant\` pv ON pv.id = ol.productVariantId
                        WHERE COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 1
                        GROUP BY ol.orderId
                    ) requiredLine ON requiredLine.orderId = o.id
                    WHERE (
                        COALESCE(o.\`customFieldsPersonalizationrequired\`, 0) = 1
                        OR o.\`customFieldsPersonalizationassetid\` IS NOT NULL
                        OR o.\`customFieldsPersonalizationuploadedat\` IS NOT NULL
                        OR COALESCE(o.\`customFieldsPersonalizationstatus\`, 'not-required') <> 'not-required'
                        OR o.\`customFieldsPersonalizationnotes\` IS NOT NULL
                        OR o.\`customFieldsPersonalizationoriginalfilename\` IS NOT NULL
                    )
                ) legacy ON legacy.lineId = ol.id
                SET
                    ol.\`customFieldsPersonalizationstatus\` = CASE
                        WHEN legacy.required = 0 AND legacy.legacyRequired = 0 THEN 'not-required'
                        WHEN legacy.legacyStatus IN ('uploaded', 'approved', 'rejected') THEN legacy.legacyStatus
                        WHEN legacy.legacyStatus = 'pending-upload' THEN 'pending-upload'
                        WHEN legacy.legacyStatus = 'pending' THEN 'pending-upload'
                        WHEN legacy.legacyAssetId IS NOT NULL OR legacy.legacyUploadedAt IS NOT NULL THEN 'uploaded'
                        ELSE 'pending-upload'
                    END,
                    ol.\`customFieldsPersonalizationassetid\` = legacy.legacyAssetId,
                    ol.\`customFieldsPersonalizationnotes\` = legacy.legacyNotes,
                    ol.\`customFieldsPersonalizationuploadedat\` = legacy.legacyUploadedAt,
                    ol.\`customFieldsPersonalizationsnapshotfilename\` = legacy.legacyOriginalFileName
            `);

            await queryRunner.query(`
                UPDATE \`order\` o
                LEFT JOIN (
                    SELECT
                        ol.orderId AS orderId,
                        SUM(CASE WHEN COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 1 THEN 1 ELSE 0 END) AS requiredCount,
                        SUM(
                            CASE
                                WHEN COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 1
                                    AND COALESCE(ol.\`customFieldsPersonalizationstatus\`, 'not-required') IN ('uploaded', 'approved')
                                THEN 1
                                ELSE 0
                            END
                        ) AS completedCount
                    FROM \`order_line\` ol
                    INNER JOIN \`product_variant\` pv ON pv.id = ol.productVariantId
                    GROUP BY ol.orderId
                ) summary ON summary.orderId = o.id
                SET o.\`customFieldsPersonalizationoverallstatus\` = CASE
                    WHEN COALESCE(summary.requiredCount, 0) = 0 THEN CASE
                        WHEN COALESCE(o.\`customFieldsPersonalizationrequired\`, 0) = 1
                            OR o.\`customFieldsPersonalizationassetid\` IS NOT NULL
                            OR o.\`customFieldsPersonalizationuploadedat\` IS NOT NULL
                            OR COALESCE(o.\`customFieldsPersonalizationstatus\`, 'not-required') <> 'not-required'
                        THEN CASE
                            WHEN COALESCE(o.\`customFieldsPersonalizationstatus\`, '') IN ('uploaded', 'approved') THEN 'complete'
                            WHEN COALESCE(o.\`customFieldsPersonalizationassetid\`, 0) <> 0
                                OR o.\`customFieldsPersonalizationuploadedat\` IS NOT NULL
                            THEN 'complete'
                            ELSE 'pending'
                        END
                        ELSE 'not-required'
                    END
                    WHEN COALESCE(summary.completedCount, 0) = 0 THEN 'pending'
                    WHEN summary.completedCount < summary.requiredCount THEN 'partial'
                    ELSE 'complete'
                END
            `);
        } else {
            await queryRunner.query(`
                UPDATE \`order\`
                SET \`customFieldsPersonalizationoverallstatus\` = CASE
                    WHEN COALESCE(\`customFieldsPersonalizationrequired\`, 0) = 0
                         AND \`customFieldsPersonalizationassetid\` IS NULL
                         AND \`customFieldsPersonalizationuploadedat\` IS NULL
                         AND COALESCE(\`customFieldsPersonalizationstatus\`, 'not-required') = 'not-required'
                    THEN 'not-required'
                    WHEN COALESCE(\`customFieldsPersonalizationstatus\`, '') IN ('uploaded', 'approved')
                    THEN 'complete'
                    WHEN \`customFieldsPersonalizationassetid\` IS NOT NULL
                         OR \`customFieldsPersonalizationuploadedat\` IS NOT NULL
                    THEN 'complete'
                    ELSE 'pending'
                END
            `);
        }

        if (await this.columnExists(queryRunner, 'order', 'customFieldsAndreaniprice')) {
            await queryRunner.query(`
                UPDATE \`order\`
                SET \`customFieldsShippingpricecents\` = ROUND(\`customFieldsAndreaniprice\` * 100)
                WHERE \`customFieldsAndreaniprice\` IS NOT NULL
                  AND \`customFieldsShippingpricecents\` IS NULL
            `);
        }

        await this.addForeignKeyIfMissing(
            queryRunner,
            'order_line',
            'FK_77f3beacbb6092907ae25f729d8',
            'customFieldsPersonalizationassetid',
        );

        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationrequired');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationstatus');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationassetid');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationassetpreviewurl');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationoriginalfilename');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationuploadedat');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationnotes');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await this.tableExists(queryRunner, 'order')) || !(await this.tableExists(queryRunner, 'order_line'))) {
            return;
        }

        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationrequired', 'TINYINT NULL DEFAULT 0');
        await this.ensureColumn(
            queryRunner,
            'order',
            'customFieldsPersonalizationstatus',
            "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
        );
        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationassetid', 'INT NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationassetpreviewurl', 'LONGTEXT NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationoriginalfilename', 'VARCHAR(255) NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationuploadedat', 'DATETIME(6) NULL');
        await this.ensureColumn(queryRunner, 'order', 'customFieldsPersonalizationnotes', 'LONGTEXT NULL');

        await queryRunner.query(`
            UPDATE \`order\` o
            INNER JOIN (
                SELECT
                    ol.orderId AS orderId,
                    MIN(ol.id) AS firstLineId
                FROM \`order_line\` ol
                WHERE
                    ol.\`customFieldsPersonalizationassetid\` IS NOT NULL
                    OR ol.\`customFieldsPersonalizationuploadedat\` IS NOT NULL
                    OR COALESCE(ol.\`customFieldsPersonalizationstatus\`, 'not-required') <> 'not-required'
                GROUP BY ol.orderId
            ) chosen ON chosen.orderId = o.id
            INNER JOIN \`order_line\` ol ON ol.id = chosen.firstLineId
            SET
                o.\`customFieldsPersonalizationrequired\` = CASE
                    WHEN COALESCE(ol.\`customFieldsPersonalizationstatus\`, 'not-required') = 'not-required' THEN 0
                    ELSE 1
                END,
                o.\`customFieldsPersonalizationstatus\` = CASE
                    WHEN ol.\`customFieldsPersonalizationstatus\` = 'pending-upload' THEN 'pending'
                    ELSE COALESCE(ol.\`customFieldsPersonalizationstatus\`, 'not-required')
                END,
                o.\`customFieldsPersonalizationassetid\` = ol.\`customFieldsPersonalizationassetid\`,
                o.\`customFieldsPersonalizationnotes\` = ol.\`customFieldsPersonalizationnotes\`,
                o.\`customFieldsPersonalizationuploadedat\` = ol.\`customFieldsPersonalizationuploadedat\`,
                o.\`customFieldsPersonalizationoriginalfilename\` = ol.\`customFieldsPersonalizationsnapshotfilename\`
        `);

        await this.dropForeignKeyIfExists(queryRunner, 'order_line', 'FK_77f3beacbb6092907ae25f729d8');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsPersonalizationoverallstatus');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsShippingquotecode');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsShippingmethodlabel');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsShippingpricecents');
        await this.dropColumnIfExists(queryRunner, 'order', 'customFieldsShippingsnapshotjson');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationstatus');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationassetid');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationnotes');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationuploadedat');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationapprovedat');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationrejectedreason');
        await this.dropColumnIfExists(queryRunner, 'order_line', 'customFieldsPersonalizationsnapshotfilename');

        await this.addForeignKeyIfMissing(
            queryRunner,
            'order',
            'FK_36294c60e9ec3e790638c17d410',
            'customFieldsPersonalizationassetid',
        );
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
            await queryRunner.query(`
                ALTER TABLE \`${tableName}\`
                ADD COLUMN \`${columnName}\` ${definition}
            `);
        } else {
            await queryRunner.query(`
                ALTER TABLE \`${tableName}\`
                MODIFY COLUMN \`${columnName}\` ${definition}
            `);
        }
    }

    private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
        if (!(await this.columnExists(queryRunner, tableName, columnName))) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            DROP COLUMN \`${columnName}\`
        `);
    }

    private async dropForeignKeyIfExists(queryRunner: QueryRunner, tableName: string, foreignKeyName: string): Promise<void> {
        const existing = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = '${foreignKeyName}'
        `);

        if (existing.length === 0) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            DROP FOREIGN KEY \`${foreignKeyName}\`
        `);
    }

    private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
        const existing = await queryRunner.query(`
            SHOW INDEX FROM \`${tableName}\`
            WHERE Key_name = '${indexName}'
        `);

        if (existing.length === 0) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            DROP INDEX \`${indexName}\`
        `);
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

        if (existing.length > 0) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            ADD CONSTRAINT \`${foreignKeyName}\`
            FOREIGN KEY (\`${columnName}\`) REFERENCES \`asset\`(\`id\`)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
        `);
    }

    private async getFirstExistingColumn(
        queryRunner: QueryRunner,
        tableName: string,
        columnNames: string[],
    ): Promise<string | null> {
        for (const columnName of columnNames) {
            if (await this.columnExists(queryRunner, tableName, columnName)) {
                return columnName;
            }
        }
        return null;
    }
}
