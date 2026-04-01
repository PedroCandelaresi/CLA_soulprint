import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconciles personalization state after the move from Order -> OrderLine.
 *
 * Goals:
 * - Normalize line-level statuses based on ProductVariant.requiresPersonalization
 * - Recompute the global order-level derived status from order lines
 * - Stay safe on environments that may have partially-applied legacy schemas
 */
export class ReconcilePersonalizationOrderLineState1716000000000 implements MigrationInterface {
    name = 'ReconcilePersonalizationOrderLineState1716000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasOrderLineCustomFields = await this.tableExists(queryRunner, 'order_line_custom_fields');
        const hasOrderCustomFields = await this.tableExists(queryRunner, 'order_custom_fields');
        const hasOrderLine = await this.tableExists(queryRunner, 'order_line');
        const hasProductVariant = await this.tableExists(queryRunner, 'product_variant');

        if (!hasOrderLineCustomFields || !hasOrderCustomFields || !hasOrderLine || !hasProductVariant) {
            return;
        }

        const variantRequiresPersonalizationColumn = await this.getFirstExistingColumn(
            queryRunner,
            'product_variant',
            ['customFieldsRequirespersonalization', 'customFieldsRequiresPersonalization'],
        );

        if (!variantRequiresPersonalizationColumn) {
            return;
        }

        const hasLineStatus = await this.columnExists(queryRunner, 'order_line_custom_fields', 'personalizationStatus');
        const hasLineAssetId = await this.columnExists(queryRunner, 'order_line_custom_fields', 'personalizationAssetId');
        const hasLineUploadedAt = await this.columnExists(queryRunner, 'order_line_custom_fields', 'personalizationUploadedAt');
        const hasOverallStatus = await this.columnExists(queryRunner, 'order_custom_fields', 'personalizationOverallStatus');

        if (hasLineStatus) {
            await queryRunner.query(`
                UPDATE order_line_custom_fields olcf
                INNER JOIN order_line ol ON ol.id = olcf.orderLineId
                INNER JOIN product_variant pv ON pv.id = ol.productVariantId
                SET olcf.personalizationStatus = CASE
                    WHEN COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 0 THEN 'not-required'
                    WHEN olcf.personalizationStatus IN ('uploaded', 'approved', 'rejected') THEN olcf.personalizationStatus
                    ${hasLineAssetId ? "WHEN olcf.personalizationAssetId IS NOT NULL THEN 'uploaded'" : ''}
                    ${hasLineUploadedAt ? "WHEN olcf.personalizationUploadedAt IS NOT NULL THEN 'uploaded'" : ''}
                    ELSE 'pending-upload'
                END
            `);
        }

        if (hasOverallStatus) {
            await queryRunner.query(`
                UPDATE order_custom_fields ocf
                LEFT JOIN (
                    SELECT
                        ol.orderId AS orderId,
                        SUM(CASE WHEN COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 1 THEN 1 ELSE 0 END) AS requiredCount,
                        SUM(
                            CASE
                                WHEN COALESCE(pv.\`${variantRequiresPersonalizationColumn}\`, 0) = 1
                                     AND COALESCE(olcf.personalizationStatus, 'not-required') IN ('uploaded', 'approved')
                                THEN 1
                                ELSE 0
                            END
                        ) AS completedCount
                    FROM order_line ol
                    INNER JOIN product_variant pv ON pv.id = ol.productVariantId
                    LEFT JOIN order_line_custom_fields olcf ON olcf.orderLineId = ol.id
                    GROUP BY ol.orderId
                ) summary ON summary.orderId = ocf.orderId
                SET ocf.personalizationOverallStatus = CASE
                    WHEN COALESCE(summary.requiredCount, 0) = 0 THEN 'not-required'
                    WHEN COALESCE(summary.completedCount, 0) = 0 THEN 'pending'
                    WHEN summary.completedCount < summary.requiredCount THEN 'partial'
                    ELSE 'complete'
                END
            `);
        }
    }

    public async down(): Promise<void> {
        // Data reconciliation only. No schema rollback needed.
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
