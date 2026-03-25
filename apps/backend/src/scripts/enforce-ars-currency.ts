import { bootstrap } from '@vendure/core';
import { ensureArgentinaDefaults, enforceArsCurrencyState } from '../bootstrap/argentina-defaults';
import { config } from '../config/vendure-config';

function printResult(result: Awaited<ReturnType<typeof enforceArsCurrencyState>>): void {
    console.log('[ars-currency] Default channel:', `${result.defaultChannelCode} (#${result.defaultChannelId})`);
    console.log('[ars-currency] Orders in database:', result.orderCount);
    console.log('[ars-currency] Channel currencies:', `${result.availableCurrenciesBefore.join(', ') || '(none)'} -> ${result.availableCurrenciesAfter.join(', ')}`);
    console.log('[ars-currency] USD rows found:', result.totalUsdRowsFound);
    console.log('[ars-currency] Deleted USD rows on soft-deleted variants:', result.deletedSoftDeletedUsdPriceCount);
    console.log('[ars-currency] Deleted duplicate active USD rows with ARS counterpart:', result.deletedDuplicateUsdPriceCount);
}

async function main(): Promise<void> {
    const app = await bootstrap(config);

    try {
        await ensureArgentinaDefaults(app);
        const result = await enforceArsCurrencyState(app);
        printResult(result);
    } finally {
        await app.close();
    }
}

main().catch(error => {
    console.error('[ars-currency] Cleanup aborted:', error instanceof Error ? error.message : error);
    process.exit(1);
});
