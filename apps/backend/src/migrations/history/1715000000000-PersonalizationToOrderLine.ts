import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: PersonalizationToOrderLine
 *
 * Moves personalization fields from order_custom_fields to order_line_custom_fields.
 * Adds provider-agnostic shipping fields to order_custom_fields.
 *
 * Strategy:
 * 1. Add new columns to order_line_custom_fields
 * 2. Add shipping + overall status columns to order_custom_fields
 * 3. Migrate existing personalization data from order → first line of each order
 * 4. Drop old personalization columns from order_custom_fields
 */
export class PersonalizationToOrderLine1715000000000 implements MigrationInterface {
    name = 'PersonalizationToOrderLine1715000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. Add personalization columns to order_line_custom_fields ──────────
        await queryRunner.query(`
            ALTER TABLE \`order_line_custom_fields\`
            ADD COLUMN \`personalizationStatus\` varchar(255) NOT NULL DEFAULT 'not-required',
            ADD COLUMN \`personalizationAssetId\` int NULL,
            ADD COLUMN \`personalizationNotes\` text NULL,
            ADD COLUMN \`personalizationUploadedAt\` datetime NULL,
            ADD COLUMN \`personalizationApprovedAt\` datetime NULL,
            ADD COLUMN \`personalizationRejectedReason\` varchar(255) NULL,
            ADD COLUMN \`personalizationSnapshotFileName\` varchar(255) NULL
        `);

        // ── 2. Add new columns to order_custom_fields ────────────────────────────
        await queryRunner.query(`
            ALTER TABLE \`order_custom_fields\`
            ADD COLUMN \`personalizationOverallStatus\` varchar(255) NOT NULL DEFAULT 'not-required',
            ADD COLUMN \`shippingQuoteCode\` varchar(255) NULL,
            ADD COLUMN \`shippingMethodLabel\` varchar(255) NULL,
            ADD COLUMN \`shippingPriceCents\` int NULL,
            ADD COLUMN \`shippingSnapshotJson\` text NULL
        `);

        // ── 3. Migrate existing personalization data to first order line ─────────
        // For each order that has a personalizationAsset, copy it to the first
        // order line (position = 0 / lowest id within that order).
        await queryRunner.query(`
            UPDATE order_line_custom_fields olcf
            INNER JOIN (
                SELECT ol.id AS line_id,
                       ocf.personalizationStatus      AS status,
                       ocf.personalizationAssetId     AS assetId,
                       ocf.personalizationNotes       AS notes,
                       ocf.personalizationUploadedAt  AS uploadedAt,
                       ocf.personalizationOriginalFilename AS fileName
                FROM order_line ol
                INNER JOIN order_custom_fields ocf ON ocf.orderId = ol.orderId
                WHERE ocf.personalizationAssetId IS NOT NULL
                  AND ol.id = (
                      SELECT MIN(ol2.id)
                      FROM order_line ol2
                      WHERE ol2.orderId = ol.orderId
                  )
            ) src ON src.line_id = olcf.orderLineId
            SET
                olcf.personalizationStatus           = COALESCE(src.status, 'uploaded'),
                olcf.personalizationAssetId          = src.assetId,
                olcf.personalizationNotes            = src.notes,
                olcf.personalizationUploadedAt       = src.uploadedAt,
                olcf.personalizationSnapshotFileName = src.fileName
        `);

        // Populate overallStatus in orders that had personalization
        await queryRunner.query(`
            UPDATE order_custom_fields ocf
            SET personalizationOverallStatus = CASE
                WHEN ocf.personalizationStatus IS NULL   THEN 'not-required'
                WHEN ocf.personalizationStatus = 'not-required' THEN 'not-required'
                WHEN ocf.personalizationStatus = 'uploaded'     THEN 'complete'
                WHEN ocf.personalizationStatus = 'pending'      THEN 'pending'
                ELSE ocf.personalizationStatus
            END
        `);

        // Migrate andreaniPrice (float) to shippingPriceCents (int) for existing orders
        await queryRunner.query(`
            UPDATE order_custom_fields
            SET shippingPriceCents = ROUND(andreaniPrice * 100)
            WHERE andreaniPrice IS NOT NULL AND shippingPriceCents IS NULL
        `);

        // ── 4. Drop old personalization columns from order_custom_fields ─────────
        await queryRunner.query(`
            ALTER TABLE \`order_custom_fields\`
            DROP COLUMN \`personalizationRequired\`,
            DROP COLUMN \`personalizationStatus\`,
            DROP COLUMN \`personalizationAssetId\`,
            DROP COLUMN \`personalizationAssetPreviewUrl\`,
            DROP COLUMN \`personalizationOriginalFilename\`,
            DROP COLUMN \`personalizationUploadedAt\`,
            DROP COLUMN \`personalizationNotes\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore old personalization columns in order_custom_fields
        await queryRunner.query(`
            ALTER TABLE \`order_custom_fields\`
            ADD COLUMN \`personalizationRequired\` tinyint NOT NULL DEFAULT 0,
            ADD COLUMN \`personalizationStatus\` varchar(255) NOT NULL DEFAULT 'not-required',
            ADD COLUMN \`personalizationAssetId\` int NULL,
            ADD COLUMN \`personalizationAssetPreviewUrl\` text NULL,
            ADD COLUMN \`personalizationOriginalFilename\` varchar(255) NULL,
            ADD COLUMN \`personalizationUploadedAt\` datetime NULL,
            ADD COLUMN \`personalizationNotes\` text NULL
        `);

        // Drop new columns
        await queryRunner.query(`
            ALTER TABLE \`order_custom_fields\`
            DROP COLUMN \`personalizationOverallStatus\`,
            DROP COLUMN \`shippingQuoteCode\`,
            DROP COLUMN \`shippingMethodLabel\`,
            DROP COLUMN \`shippingPriceCents\`,
            DROP COLUMN \`shippingSnapshotJson\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`order_line_custom_fields\`
            DROP COLUMN \`personalizationStatus\`,
            DROP COLUMN \`personalizationAssetId\`,
            DROP COLUMN \`personalizationNotes\`,
            DROP COLUMN \`personalizationUploadedAt\`,
            DROP COLUMN \`personalizationApprovedAt\`,
            DROP COLUMN \`personalizationRejectedReason\`,
            DROP COLUMN \`personalizationSnapshotFileName\`
        `);
    }
}
