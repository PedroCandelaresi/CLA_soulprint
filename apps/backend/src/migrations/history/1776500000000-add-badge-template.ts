import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddBadgeTemplate1776500000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create badge_template table
        await queryRunner.createTable(
            new Table({
                name: 'badge_template',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                    { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
                    { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
                    { name: 'name', type: 'varchar', length: '255' },
                    { name: 'svgTemplate', type: 'text' },
                    { name: 'defaultParams', type: 'text', isNullable: true },
                ],
            }),
        );

        // Add templateId FK column to badge
        await queryRunner.addColumn(
            'badge',
            new TableColumn({ name: 'templateId', type: 'int', isNullable: true }),
        );

        // Add templateParams column to badge
        await queryRunner.addColumn(
            'badge',
            new TableColumn({ name: 'templateParams', type: 'text', isNullable: true }),
        );

        // Add renderedSvg column to badge
        await queryRunner.addColumn(
            'badge',
            new TableColumn({ name: 'renderedSvg', type: 'mediumtext', isNullable: true }),
        );

        // Add FK: badge.templateId → badge_template.id
        await queryRunner.createForeignKey(
            'badge',
            new TableForeignKey({
                columnNames: ['templateId'],
                referencedTableName: 'badge_template',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                onUpdate: 'NO ACTION',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FK
        const badgeTable = await queryRunner.getTable('badge');
        const templateFk = badgeTable?.foreignKeys.find(fk => fk.columnNames.includes('templateId'));
        if (templateFk) {
            await queryRunner.dropForeignKey('badge', templateFk);
        }

        // Drop columns
        if (await queryRunner.hasColumn('badge', 'renderedSvg')) {
            await queryRunner.dropColumn('badge', 'renderedSvg');
        }
        if (await queryRunner.hasColumn('badge', 'templateParams')) {
            await queryRunner.dropColumn('badge', 'templateParams');
        }
        if (await queryRunner.hasColumn('badge', 'templateId')) {
            await queryRunner.dropColumn('badge', 'templateId');
        }

        // Drop table
        await queryRunner.dropTable('badge_template');
    }
}
