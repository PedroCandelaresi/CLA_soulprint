/**
 * Drops and recreates the configured database before the backend starts.
 * Used on each container boot when RECREATE_DB_ON_START=true.
 *
 * With DB_SYNCHRONIZE=true, Vendure will then rebuild all tables from the
 * entity metadata when the server boots — no migrations needed.
 */
const mysql = require('mysql2/promise');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(options) {
    const attempts = Number(process.env.DB_CONNECT_RETRIES || 30);
    const delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await mysql.createConnection(options);
        } catch (error) {
            lastError = error;
            console.warn(`[reset-db] Database unavailable (${attempt}/${attempts}): ${error.message}`);
            if (attempt < attempts) {
                await sleep(delayMs);
            }
        }
    }

    throw lastError;
}

async function main() {
    if (process.env.RECREATE_DB_ON_START !== 'true') {
        console.log('[reset-db] RECREATE_DB_ON_START != "true" — skipping.');
        return;
    }

    const appEnv = process.env.APP_ENV || 'local';
    const isPersistentEnv = appEnv === 'testing' || appEnv === 'production';
    if (isPersistentEnv && process.env.ALLOW_DESTRUCTIVE_SYNC !== 'true') {
        throw new Error(
            `[reset-db] Refusing to recreate the database in APP_ENV=${appEnv} without ALLOW_DESTRUCTIVE_SYNC=true.`,
        );
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'vendure';

    console.log(`[reset-db] Dropping and recreating database "${database}" on ${host}:${port}...`);

    const connection = await connectWithRetry({ host, port, user, password, multipleStatements: true });
    try {
        await connection.query(`DROP DATABASE IF EXISTS \`${database}\`;`);
        await connection.query(
            `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
        );
        console.log('[reset-db] Done.');
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error('[reset-db] Failed:', error);
    process.exit(1);
});
