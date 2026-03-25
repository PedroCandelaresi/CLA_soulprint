import { adminUiPaths, buildAdminUi } from './config';

async function main(): Promise<void> {
    console.info(`[admin-ui] Building CLA Soulprint admin UI into ${adminUiPaths.outputPath}`);
    await buildAdminUi();
    console.info('[admin-ui] Admin UI build completed successfully');
}

main().catch((error) => {
    console.error('[admin-ui] Failed to build CLA Soulprint admin UI', error);
    process.exit(1);
});
