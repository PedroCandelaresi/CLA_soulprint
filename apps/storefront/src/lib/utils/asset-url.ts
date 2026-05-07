const rasterPreviewPattern = /\.(jpe?g|png)$/i;

export function isVendureAssetUrl(url: string): boolean {
    return url.startsWith('/assets/') || url.includes('/assets/');
}

export function getVendurePreviewWebpUrl(previewUrl: string): string | null {
    if (!previewUrl) {
        return null;
    }

    if (process.env.NEXT_PUBLIC_ENABLE_VENDURE_WEBP_PREVIEW !== 'true') {
        return null;
    }

    if (!previewUrl.includes('/preview/') || previewUrl.includes('/preview-webp/')) {
        return null;
    }

    if (!rasterPreviewPattern.test(previewUrl)) {
        return null;
    }

    return previewUrl.replace('/preview/', '/preview-webp/').replace(/\.(jpe?g|png)$/i, '.webp');
}
