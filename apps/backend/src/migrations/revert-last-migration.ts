import 'dotenv/config';
import { revertLastMigration } from '@vendure/core';

async function main(): Promise<void> {
    process.env.VENDURE_RUN_MIGRATIONS = 'true';
    const { config } = await import('../config/vendure-config');
    await revertLastMigration(config);
    console.log('Reverted last migration.');
}

main().catch((error) => {
    console.error('Failed to revert last migration:', error);
    process.exit(1);
});
