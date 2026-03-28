import { MigrationInterface, QueryRunner } from 'typeorm';

type ColumnDefinition = {
    targetName: string;
    definition: string;
    legacyNames?: string[];
    copyCondition?: string;
};

export class AlignOrderCustomFieldSchema1711000000000 implements MigrationInterface {
    name = 'AlignOrderCustomFieldSchema1711000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.dropForeignKeyIfExists(queryRunner, 'order', 'FK_order_personalization_asset');
        await this.dropIndexIfExists(queryRunner, 'order', 'IDX_order_personalization_asset');

        await this.ensureColumn(queryRunner, 'product_variant', {
            targetName: 'customFieldsRequirespersonalization',
            definition: 'TINYINT NULL DEFAULT 0',
            legacyNames: ['customFieldsRequiresPersonalization'],
            copyCondition: '`customFieldsRequirespersonalization` IS NULL OR `customFieldsRequirespersonalization` = 0',
        });

        const orderColumns: ColumnDefinition[] = [
            {
                targetName: 'customFieldsAndreanicarrier',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniCarrier'],
            },
            {
                targetName: 'customFieldsAndreaniservicecode',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniServiceCode'],
            },
            {
                targetName: 'customFieldsAndreaniservicename',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniServiceName'],
            },
            {
                targetName: 'customFieldsAndreaniprice',
                definition: 'DOUBLE NULL',
                legacyNames: ['customFieldsAndreaniPrice'],
            },
            {
                targetName: 'customFieldsAndreanicurrency',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniCurrency'],
            },
            {
                targetName: 'customFieldsAndreanidestinationpostalcode',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniDestinationPostalCode'],
            },
            {
                targetName: 'customFieldsAndreanidestinationcity',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniDestinationCity'],
            },
            {
                targetName: 'customFieldsAndreaniselectionmetadata',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniSelectionMetadata'],
            },
            {
                targetName: 'customFieldsAndreaniweightkg',
                definition: 'DOUBLE NULL',
                legacyNames: ['customFieldsAndreaniWeightKg'],
            },
            {
                targetName: 'customFieldsAndreanidimensions',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniDimensions'],
            },
            {
                targetName: 'customFieldsAndreanishipmentcreated',
                definition: 'TINYINT NULL',
                legacyNames: ['customFieldsAndreaniShipmentCreated'],
            },
            {
                targetName: 'customFieldsAndreanishipmentdate',
                definition: 'DATETIME(6) NULL',
                legacyNames: ['customFieldsAndreaniShipmentDate'],
            },
            {
                targetName: 'customFieldsAndreanitrackingnumber',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniTrackingNumber'],
            },
            {
                targetName: 'customFieldsAndreanishipmentid',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniShipmentId'],
            },
            {
                targetName: 'customFieldsAndreanishipmentstatus',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniShipmentStatus'],
            },
            {
                targetName: 'customFieldsAndreanishipmentrawresponse',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsAndreaniShipmentRawResponse'],
            },
            {
                targetName: 'customFieldsPersonalizationrequired',
                definition: 'TINYINT NULL DEFAULT 0',
                legacyNames: ['customFieldsPersonalizationRequired'],
                copyCondition: '`customFieldsPersonalizationrequired` IS NULL OR `customFieldsPersonalizationrequired` = 0',
            },
            {
                targetName: 'customFieldsPersonalizationstatus',
                definition: "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
                legacyNames: ['customFieldsPersonalizationStatus'],
                copyCondition: "`customFieldsPersonalizationstatus` = 'not-required'",
            },
            {
                targetName: 'customFieldsPersonalizationassetid',
                definition: 'INT NULL',
                legacyNames: ['customFieldsPersonalizationAssetId'],
            },
            {
                targetName: 'customFieldsPersonalizationassetpreviewurl',
                definition: 'LONGTEXT NULL',
                legacyNames: ['customFieldsPersonalizationAssetPreviewUrl'],
            },
            {
                targetName: 'customFieldsPersonalizationoriginalfilename',
                definition: 'VARCHAR(255) NULL',
                legacyNames: ['customFieldsPersonalizationOriginalFilename'],
            },
            {
                targetName: 'customFieldsPersonalizationuploadedat',
                definition: 'DATETIME(6) NULL',
                legacyNames: ['customFieldsPersonalizationUploadedAt'],
            },
            {
                targetName: 'customFieldsPersonalizationnotes',
                definition: 'LONGTEXT NULL',
                legacyNames: ['customFieldsPersonalizationNotes'],
            },
        ];

        for (const column of orderColumns) {
            await this.ensureColumn(queryRunner, 'order', column);
        }

        await this.addForeignKeyIfMissing(
            queryRunner,
            'order',
            'FK_36294c60e9ec3e790638c17d410',
            'customFieldsPersonalizationassetid',
        );

        console.log('[Migration] Aligned order/product_variant custom field schema with Vendure config');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.dropForeignKeyIfExists(queryRunner, 'order', 'FK_36294c60e9ec3e790638c17d410');

        await this.renameColumnIfPresent(
            queryRunner,
            'product_variant',
            'customFieldsRequirespersonalization',
            'customFieldsRequiresPersonalization',
            "TINYINT(1) NOT NULL DEFAULT '0'",
        );

        const personalizationColumns: Array<{
            currentName: string;
            previousName: string;
            definition: string;
        }> = [
            {
                currentName: 'customFieldsPersonalizationrequired',
                previousName: 'customFieldsPersonalizationRequired',
                definition: "TINYINT(1) NOT NULL DEFAULT '0'",
            },
            {
                currentName: 'customFieldsPersonalizationstatus',
                previousName: 'customFieldsPersonalizationStatus',
                definition: "VARCHAR(255) NOT NULL DEFAULT 'not-required'",
            },
            {
                currentName: 'customFieldsPersonalizationassetid',
                previousName: 'customFieldsPersonalizationAssetId',
                definition: 'INT NULL',
            },
            {
                currentName: 'customFieldsPersonalizationassetpreviewurl',
                previousName: 'customFieldsPersonalizationAssetPreviewUrl',
                definition: 'TEXT NULL',
            },
            {
                currentName: 'customFieldsPersonalizationoriginalfilename',
                previousName: 'customFieldsPersonalizationOriginalFilename',
                definition: 'VARCHAR(255) NULL',
            },
            {
                currentName: 'customFieldsPersonalizationuploadedat',
                previousName: 'customFieldsPersonalizationUploadedAt',
                definition: 'DATETIME NULL',
            },
            {
                currentName: 'customFieldsPersonalizationnotes',
                previousName: 'customFieldsPersonalizationNotes',
                definition: 'TEXT NULL',
            },
        ];

        for (const column of personalizationColumns) {
            await this.renameColumnIfPresent(queryRunner, 'order', column.currentName, column.previousName, column.definition);
        }

        const andreaniColumns = [
            'customFieldsAndreanicarrier',
            'customFieldsAndreaniservicecode',
            'customFieldsAndreaniservicename',
            'customFieldsAndreaniprice',
            'customFieldsAndreanicurrency',
            'customFieldsAndreanidestinationpostalcode',
            'customFieldsAndreanidestinationcity',
            'customFieldsAndreaniselectionmetadata',
            'customFieldsAndreaniweightkg',
            'customFieldsAndreanidimensions',
            'customFieldsAndreanishipmentcreated',
            'customFieldsAndreanishipmentdate',
            'customFieldsAndreanitrackingnumber',
            'customFieldsAndreanishipmentid',
            'customFieldsAndreanishipmentstatus',
            'customFieldsAndreanishipmentrawresponse',
        ];

        for (const column of andreaniColumns) {
            await this.dropColumnIfExists(queryRunner, 'order', column);
        }

        if (await this.hasColumn(queryRunner, 'order', 'customFieldsPersonalizationAssetId')) {
            await queryRunner.query(`
                ALTER TABLE \`order\`
                ADD INDEX \`IDX_order_personalization_asset\` (\`customFieldsPersonalizationAssetId\`)
            `);

            await queryRunner.query(`
                ALTER TABLE \`order\`
                ADD CONSTRAINT \`FK_order_personalization_asset\`
                FOREIGN KEY (\`customFieldsPersonalizationAssetId\`) REFERENCES \`asset\`(\`id\`)
                ON DELETE SET NULL
            `);
        }
    }

    private async ensureColumn(queryRunner: QueryRunner, tableName: string, column: ColumnDefinition): Promise<void> {
        const { targetName, definition, legacyNames = [], copyCondition } = column;

        for (const legacyName of legacyNames) {
            if (!(await this.hasColumn(queryRunner, tableName, legacyName))) {
                continue;
            }

            if (await this.hasColumn(queryRunner, tableName, targetName)) {
                await queryRunner.query(`
                    UPDATE \`${tableName}\`
                    SET \`${targetName}\` = \`${legacyName}\`
                    WHERE \`${legacyName}\` IS NOT NULL
                      AND (${copyCondition ?? `\`${targetName}\` IS NULL`})
                `);

                await this.dropColumnIfExists(queryRunner, tableName, legacyName);
                continue;
            }

            await queryRunner.query(`
                ALTER TABLE \`${tableName}\`
                CHANGE \`${legacyName}\` \`${targetName}\` ${definition}
            `);
            break;
        }

        if (!(await this.hasColumn(queryRunner, tableName, targetName))) {
            await queryRunner.query(`
                ALTER TABLE \`${tableName}\`
                ADD COLUMN \`${targetName}\` ${definition}
            `);
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            MODIFY COLUMN \`${targetName}\` ${definition}
        `);
    }

    private async renameColumnIfPresent(
        queryRunner: QueryRunner,
        tableName: string,
        currentName: string,
        nextName: string,
        definition: string,
    ): Promise<void> {
        if (!(await this.hasColumn(queryRunner, tableName, currentName))) {
            return;
        }

        if (await this.hasColumn(queryRunner, tableName, nextName)) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            CHANGE \`${currentName}\` \`${nextName}\` ${definition}
        `);
    }

    private async addForeignKeyIfMissing(
        queryRunner: QueryRunner,
        tableName: string,
        foreignKeyName: string,
        columnName: string,
    ): Promise<void> {
        const existing = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = '${tableName}'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = '${foreignKeyName}'
        `);

        if (existing.length > 0 || !(await this.hasColumn(queryRunner, tableName, columnName))) {
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

    private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
        if (!(await this.hasColumn(queryRunner, tableName, columnName))) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`${tableName}\`
            DROP COLUMN \`${columnName}\`
        `);
    }

    private async hasColumn(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        return queryRunner.hasColumn(tableName, columnName);
    }
}
