import 'dotenv/config';
import { runMigrations } from '@vendure/core';

async function main(): Promise<void> {
    if (process.env.DB_SYNCHRONIZE === 'true') {
        console.log('Skipping migrations because DB_SYNCHRONIZE=true.');
        return;
    }
    if (process.env.RECREATE_DB_ON_START === 'true') {
        console.log('Skipping migrations because RECREATE_DB_ON_START=true (schema will be synchronized from entities).');
        return;
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
