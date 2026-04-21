import 'dotenv/config';
import { runMigrations } from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

async function baselineIfNeeded(): Promise<void> {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: false,
    });

    try {
        await connection.query(
            'CREATE TABLE IF NOT EXISTS vendure_migrations (' +
                '`id` int NOT NULL AUTO_INCREMENT,' +
                '`timestamp` bigint NOT NULL,' +
                '`name` varchar(255) NOT NULL,' +
                'PRIMARY KEY (`id`)' +
                ') ENGINE=InnoDB',
        );

        async function tableExists(tableName: string): Promise<boolean> {
            const [rows] = (await connection.query(
                'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
                [tableName],
            )) as any;
            return Number(rows[0].c) > 0;
        }

        async function columnExists(tableName: string, columnName: string): Promise<boolean> {
            const [rows] = (await connection.query(
                'SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
                [tableName, columnName],
            )) as any;
            return Number(rows[0].c) > 0;
        }

        const schemaExists = await tableExists('badge');
        if (!schemaExists) {
            return;
        }

        const historyDir = path.join(__dirname, 'history');
        if (!fs.existsSync(historyDir)) {
            return;
        }
        // Only baseline stable legacy migrations automatically. Newer feature migrations
        // are marked applied only if their schema already exists, so a missing carousel
        // table can still be created normally on deploy.
        const BASELINE_CUTOFF_TIMESTAMP = 1777000001000;
        const conditionalBaselineChecks: Record<number, () => Promise<boolean>> = {
            1777100000000: () => tableExists('home_carousel_slide'),
            1777200000000: async () =>
                (await tableExists('home_carousel_settings')) &&
                (await columnExists('home_carousel_slide', 'layout')) &&
                (await columnExists('home_carousel_slide', 'textTheme')) &&
                (await columnExists('home_carousel_slide', 'badgeVariant')),
        };
        const migrationFiles = fs
            .readdirSync(historyDir)
            .filter((f) => /^\d+-.+\.(ts|js)$/.test(f))
            .sort();

        for (const file of migrationFiles) {
            const match = file.match(/^(\d+)-(.+)\.(ts|js)$/);
            if (!match) continue;
            const timestamp = match[1];
            const numericTimestamp = Number(timestamp);
            const shouldBaseline =
                numericTimestamp <= BASELINE_CUTOFF_TIMESTAMP ||
                Boolean(await conditionalBaselineChecks[numericTimestamp]?.());
            if (!shouldBaseline) {
                continue;
            }
            const kebab = match[2];
            const pascal = kebab
                .split('-')
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join('');
            const name = `${pascal}${timestamp}`;

            const [existing] = (await connection.query(
                'SELECT id FROM vendure_migrations WHERE name = ? LIMIT 1',
                [name],
            )) as any;
            if (existing.length === 0) {
                await connection.query(
                    'INSERT INTO vendure_migrations (`timestamp`, `name`) VALUES (?, ?)',
                    [numericTimestamp, name],
                );
                console.log(`[baseline] Marked migration as applied: ${name}`);
            }
        }
    } finally {
        await connection.end();
    }
}

async function main(): Promise<void> {
    if (process.env.DB_SYNCHRONIZE === 'true') {
        console.log('Skipping migrations because DB_SYNCHRONIZE=true.');
        return;
    }
    if (process.env.RECREATE_DB_ON_START === 'true') {
        console.log('Skipping migrations because RECREATE_DB_ON_START=true (schema will be synchronized from entities).');
        return;
    }

    try {
        await baselineIfNeeded();
    } catch (err) {
        console.warn('[baseline] Skipped baseline check:', (err as Error).message);
    }

    process.env.VENDURE_RUN_MIGRATIONS = 'true';
    const { config } = await import('../config/vendure-config');
    const appliedMigrations = await runMigrations(config);

    if (appliedMigrations.length === 0) {
        console.log('No pending migrations.');
        return;
    }

    console.log('Applied migrations:');
    for (const migration of appliedMigrations) {
        console.log(`- ${migration}`);
    }
}

main().catch((error) => {
    console.error('Failed to run migrations:', error);
    process.exit(1);
});
