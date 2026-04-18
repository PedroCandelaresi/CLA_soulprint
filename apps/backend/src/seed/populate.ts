import { bootstrap } from '@vendure/core';
import { config } from '../config/vendure-config';
import { ensureDemoData } from './ensure-demo-data';

async function seed() {
    const app = await bootstrap({
        ...config,
        apiOptions: {
            ...config.apiOptions,
            port: Number(process.env.SEED_PORT || 0),
        },
    });

    const summary = await ensureDemoData(app);
    console.log(
        `Demo data ensured. Created: ${
            summary.created.length ? summary.created.join(', ') : 'nothing'
        }. Existing: ${summary.existing.length ? summary.existing.join(', ') : 'nothing'}.`,
    );

    await app.close();
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
