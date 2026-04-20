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

        const [schemaRows] = (await connection.query(
            "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'badge'",
        )) as any;
        const schemaExists = Number(schemaRows[0].c) > 0;
        if (!schemaExists) {
            return;
        }

        const historyDir = path.join(__dirname, 'history');
        if (!fs.existsSync(historyDir)) {
            return;
        }
        // Only baseline migrations up to this cutoff — anything newer must run normally
        // against the live DB. Bump this after verifying a new migration ran on all
        // environments at least once.
        const BASELINE_CUTOFF_TIMESTAMP = 1777000001000;
        const migrationFiles = fs
            .readdirSync(historyDir)
            .filter((f) => /^\d+-.+\.(ts|js)$/.test(f))
            .sort();

        for (const file of migrationFiles) {
            const match = file.match(/^(\d+)-(.+)\.(ts|js)$/);
            if (!match) continue;
            const timestamp = match[1];
            if (Number(timestamp) > BASELINE_CUTOFF_TIMESTAMP) {
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
                    [Number(timestamp), name],
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
