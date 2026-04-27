import { AssetStorageStrategy, Logger } from '@vendure/core';
import { AssetServerOptions } from '@vendure/asset-server-plugin';
import { LocalAssetStorageStrategy } from '@vendure/asset-server-plugin/lib/src/local-asset-storage-strategy';
import type { Request } from 'express';
import type { Stream } from 'stream';
import sharp from 'sharp';

const logCtx = 'WebpStorageStrategy';

export class WebpStorageStrategy implements AssetStorageStrategy {
    constructor(private readonly inner: LocalAssetStorageStrategy) {}

    writeFileFromStream(fileName: string, data: Stream): Promise<string> {
        // LocalAssetStorageStrategy expects ReadStream; Vendure always passes one at runtime.
        return this.inner.writeFileFromStream(fileName, data as any);
    }

    readFileToBuffer(identifier: string): Promise<Buffer> {
        return this.inner.readFileToBuffer(identifier);
    }

    readFileToStream(identifier: string): Promise<Stream> {
        return this.inner.readFileToStream(identifier);
    }

    fileExists(fileName: string): Promise<boolean> {
        return this.inner.fileExists(fileName);
    }

    deleteFile(identifier: string): Promise<void> {
        return this.inner.deleteFile(identifier);
    }

    get toAbsoluteUrl(): ((request: Request, identifier: string) => string) | undefined {
        return this.inner.toAbsoluteUrl;
    }

    async writeFileFromBuffer(fileName: string, data: Buffer): Promise<string> {
        const identifier = await this.inner.writeFileFromBuffer(fileName, data);

        if (
            !fileName.startsWith('preview/') ||
            /\.(svg|webp)$/i.test(fileName)
        ) {
            return identifier;
        }

        // preview/ab/file__preview.jpg  →  preview-webp/ab/file__preview.webp
        const webpFileName = fileName
            .replace(/^preview\//, 'preview-webp/')
            .replace(/\.[^.]+$/, '.webp');

        try {
            const webpBuffer = await sharp(data)
                .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82 })
                .toBuffer();
            await this.inner.writeFileFromBuffer(webpFileName, webpBuffer);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            Logger.warn(`WebP generation skipped for "${fileName}": ${msg}`, logCtx);
        }

        return identifier;
    }
}

export function createWebpStorageStrategy(options: AssetServerOptions): WebpStorageStrategy {
    const rawPrefix = options.assetUrlPrefix;
    const prefix =
        typeof rawPrefix === 'string'
            ? rawPrefix.endsWith('/')
                ? rawPrefix
                : `${rawPrefix}/`
            : '/assets/';

    const toAbsoluteUrl = (req: Request, identifier: string): string => {
        if (!identifier) return '';
        return identifier.startsWith(prefix) ? identifier : `${prefix}${identifier}`;
    };

    const inner = new LocalAssetStorageStrategy(options.assetUploadDir, toAbsoluteUrl);
    return new WebpStorageStrategy(inner);
}
