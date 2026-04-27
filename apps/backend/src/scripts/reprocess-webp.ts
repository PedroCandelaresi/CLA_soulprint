/**
 * Reprocess existing asset previews and generate missing WebP versions.
 *
 * Usage:
 *   pnpm --filter backend reprocess:webp                          # dry-run (default)
 *   pnpm --filter backend reprocess:webp -- --write               # write files
 *   pnpm --filter backend reprocess:webp -- --write --limit=50    # write at most 50
 *   pnpm --filter backend reprocess:webp -- --assets-dir=/custom/path
 *
 * In Docker:
 *   node dist/scripts/reprocess-webp.js --write --assets-dir=/usr/src/app/apps/backend/static/assets
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const hasFlag = (flag: string) => argv.includes(flag);
const getArg = (prefix: string): string | undefined =>
    argv.find(a => a.startsWith(prefix))?.slice(prefix.length);

const IS_DRY_RUN = !hasFlag('--write');
const LIMIT: number = parseInt(getArg('--limit=') ?? '0', 10) || 0; // 0 = no limit

const DEFAULT_ASSETS_DIR = path.resolve(__dirname, '../../static/assets');
const ASSETS_DIR = getArg('--assets-dir=') ?? DEFAULT_ASSETS_DIR;

const PREVIEW_DIR = path.join(ASSETS_DIR, 'preview');
const PREVIEW_WEBP_DIR = path.join(ASSETS_DIR, 'preview-webp');

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

let found = 0;
let alreadyExists = 0;
let processed = 0;
let skipped = 0;
let errors = 0;
const errorList: string[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toWebpPath(previewFilePath: string): string {
    const rel = path.relative(PREVIEW_DIR, previewFilePath);
    const noExt = rel.replace(/\.[^.]+$/, '.webp');
    return path.join(PREVIEW_WEBP_DIR, noExt);
}

function log(msg: string) {
    process.stdout.write(msg + '\n');
}

function logDry(msg: string) {
    process.stdout.write(`[DRY-RUN] ${msg}\n`);
}

async function collectPreviews(dir: string): Promise<string[]> {
    const results: string[] = [];
    let entries: import('fs').Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...await collectPreviews(fullPath));
        } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

async function processFile(srcPath: string): Promise<void> {
    found++;
    const destPath = toWebpPath(srcPath);
    const relSrc = path.relative(ASSETS_DIR, srcPath);
    const relDest = path.relative(ASSETS_DIR, destPath);

    // Check if WebP already exists
    try {
        await fs.access(destPath);
        alreadyExists++;
        log(`  SKIP  ${relSrc}  →  ${relDest}  (already exists)`);
        return;
    } catch {
        // doesn't exist — proceed
    }

    if (IS_DRY_RUN) {
        logDry(`WOULD WRITE  ${relSrc}  →  ${relDest}`);
        processed++;
        return;
    }

    // Validate format with sharp
    let image: sharp.Sharp;
    let meta: sharp.Metadata;
    try {
        image = sharp(srcPath);
        meta = await image.metadata();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors++;
        errorList.push(`${relSrc}: cannot read — ${msg}`);
        log(`  ERR   ${relSrc}: cannot read — ${msg}`);
        return;
    }

    if (meta.format !== 'jpeg' && meta.format !== 'png') {
        skipped++;
        log(`  SKIP  ${relSrc}: unsupported format "${meta.format ?? 'unknown'}"`);
        return;
    }

    // Generate WebP
    try {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        const webpBuffer = await image
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
        await fs.writeFile(destPath, webpBuffer);
        processed++;
        log(`  OK    ${relSrc}  →  ${relDest}  (${webpBuffer.length} bytes)`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors++;
        errorList.push(`${relSrc}: conversion failed — ${msg}`);
        log(`  ERR   ${relSrc}: conversion failed — ${msg}`);
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    log('');
    log('='.repeat(60));
    log('  reprocess-webp — Vendure asset WebP backfill');
    log('='.repeat(60));
    log(`  Mode      : ${IS_DRY_RUN ? 'DRY-RUN (no files will be written)' : 'WRITE'}`);
    log(`  Assets dir: ${ASSETS_DIR}`);
    log(`  Preview   : ${PREVIEW_DIR}`);
    log(`  Dest      : ${PREVIEW_WEBP_DIR}`);
    log(`  Limit     : ${LIMIT > 0 ? LIMIT : 'none'}`);
    log('='.repeat(60));
    log('');

    // Verify preview dir exists
    try {
        await fs.access(PREVIEW_DIR);
    } catch {
        log(`ERROR: preview directory not found: ${PREVIEW_DIR}`);
        log('Use --assets-dir=/path/to/static/assets to override.');
        process.exit(1);
    }

    log('Scanning preview directory...');
    const files = await collectPreviews(PREVIEW_DIR);
    log(`Found ${files.length} raster preview file(s).\n`);

    const toProcess = LIMIT > 0 ? files.slice(0, LIMIT) : files;

    for (const file of toProcess) {
        await processFile(file);
    }

    // Summary
    log('');
    log('='.repeat(60));
    log('  Summary');
    log('='.repeat(60));
    log(`  Total previews found : ${found}`);
    log(`  Already had WebP     : ${alreadyExists}`);
    log(`  ${IS_DRY_RUN ? 'Would be written ' : 'Written          '} : ${processed}`);
    log(`  Skipped (bad format) : ${skipped}`);
    log(`  Errors               : ${errors}`);
    if (LIMIT > 0 && files.length > LIMIT) {
        log(`  Remaining (over limit): ${files.length - LIMIT}`);
    }
    if (errorList.length > 0) {
        log('');
        log('  Failed files:');
        errorList.forEach(e => log(`    - ${e}`));
    }
    log('='.repeat(60));
    if (IS_DRY_RUN) {
        log('');
        log('  This was a dry-run. Run with --write to apply changes.');
    }
    log('');

    // Exit 0 even with partial errors (they are reported in summary)
    process.exit(0);
}

main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
