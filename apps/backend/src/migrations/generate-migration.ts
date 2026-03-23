import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateMigration } from '@vendure/core';

async function main(): Promise<void> {
    process.env.VENDURE_RUN_MIGRATIONS = 'true';
    const name = process.env.npm_config_name;

    if (!name) {
        console.error('Missing migration name. Usage: pnpm --dir apps/backend migration:generate --name <migration-name>');
        process.exit(1);
    }

    const outputDir = path.join(__dirname, 'history');
    await fs.mkdir(outputDir, { recursive: true });
    const { config } = await import('../config/vendure-config');
    const migrationPath = await generateMigration(config, { name, outputDir });

    if (!migrationPath) {
        console.log('No schema changes detected. No migration file generated.');
        return;
    }

    console.log(`Migration generated: ${migrationPath}`);
}

main().catch((error) => {
    console.error('Failed to generate migration:', error);
    process.exit(1);
});
