export type OperatorTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface PersonalizationSideView {
    key: 'front' | 'back';
    label: string;
    mode: string;
    status: string;
    text: string | null;
    uploadedAt: string | null;
    snapshotFileName: string | null;
    assetPreview: string | null;
    assetSource: string | null;
    assetMimeType: string | null;
    assetFileSize: number | null;
    requiresFile: boolean;
    complete: boolean;
}

export interface PersonalizationLineView {
    id: string;
    quantity: number;
    productName: string;
    variantName: string;
    requiresPersonalization: boolean;
    personalizationStatus: string;
    personalizationNotes: string | null;
    personalizationUploadedAt: string | null;
    personalizationApprovedAt: string | null;
    personalizationSnapshotFileName: string | null;
    personalizationAssetPreview: string | null;
    personalizationAssetSource: string | null;
    sides: PersonalizationSideView[];
}

export interface PersonalizationViewModel {
    personalizationRequired: boolean;
    personalizationTone: OperatorTone;
    personalizationLabel: string;
    personalizationDescription: string;
    personalizationRequiredCount: number;
    personalizationCompletedCount: number;
    personalizationPendingCount: number;
    lines: PersonalizationLineView[];
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmpty(...values: unknown[]): string | null {
    for (const value of values) {
        const normalized = normalizeText(value);
        if (normalized) return normalized;
    }
    return null;
}

function isCompletedLineStatus(status: string): boolean {
    return status === 'uploaded' || status === 'approved';
}

function getMode(value: unknown, fallback: string): string {
    const normalized = normalizeText(value);
    return normalized || fallback;
}

function isImageMode(mode: string): boolean {
    return mode === 'image';
}

function isTextMode(mode: string): boolean {
    return mode === 'text';
}

function hasAsset(side: PersonalizationSideView): boolean {
    return Boolean(side.assetSource || side.assetPreview);
}

function buildSide(
    key: 'front' | 'back',
    label: string,
    mode: string,
    status: string,
    text: string | null,
    uploadedAt: string | null,
    snapshotFileName: string | null,
    asset: any,
): PersonalizationSideView {
    const side: PersonalizationSideView = {
        key,
        label,
        mode,
        status,
        text,
        uploadedAt,
        snapshotFileName,
        assetPreview: firstNonEmpty(asset?.preview),
        assetSource: firstNonEmpty(asset?.source),
        assetMimeType: firstNonEmpty(asset?.mimeType),
        assetFileSize: typeof asset?.fileSize === 'number' ? asset.fileSize : null,
        requiresFile: isImageMode(mode),
        complete: false,
    };

    side.complete = isTextMode(mode)
        ? Boolean(side.text)
        : isImageMode(mode)
            ? hasAsset(side) || isCompletedLineStatus(status)
            : true;

    return side;
}

function getLineStatus(requiresPersonalization: boolean, sides: PersonalizationSideView[]): string {
    if (!requiresPersonalization) return 'not-required';
    if (sides.some(side => side.status === 'rejected')) return 'rejected';
    return sides.every(side => side.complete) ? 'uploaded' : 'pending-upload';
}

function getPersonalizationCopy(requiredCount: number, completedCount: number): { label: string; description: string; tone: OperatorTone } {
    if (requiredCount === 0) {
        return {
            label: 'No requiere personalización',
            description: 'Este pedido puede avanzar sin que el cliente cargue archivos.',
            tone: 'neutral',
        };
    }
    if (completedCount === 0) {
        return {
            label: 'Faltan todos los archivos',
            description: 'Todavía no hay ninguna imagen lista para revisar.',
            tone: 'warning',
        };
    }
    if (completedCount < requiredCount) {
        return {
            label: 'Faltan algunos archivos',
            description: `Hay ${completedCount} línea(s) listas y ${requiredCount - completedCount} pendiente(s).`,
            tone: 'warning',
        };
    }
    return {
        label: 'Todo recibido',
        description: 'Ya están cargados todos los archivos necesarios para producir.',
        tone: 'success',
    };
}

export function getToneClass(tone: OperatorTone): string {
    return `cla-tone-${tone}`;
}

export function getPersonalizationLineStatusLabel(status: string): string {
    switch (status) {
        case 'pending-upload': return 'Pendiente';
        case 'uploaded': return 'Completa';
        case 'approved': return 'Aprobado';
        case 'rejected': return 'Rechazado';
        default: return 'No requerida';
    }
}

export function getPersonalizationLineStatusTone(status: string): OperatorTone {
    switch (status) {
        case 'uploaded':
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        case 'pending-upload':
            return 'warning';
        default:
            return 'neutral';
    }
}

export function buildPersonalizationViewModel(order: any): PersonalizationViewModel {
    const lines: PersonalizationLineView[] = (order?.lines ?? []).map((line: any) => {
        const customFields = line?.customFields ?? {};
        const frontMode = getMode(customFields.frontMode, 'image');
        const backMode = getMode(customFields.backMode, 'none');
        const frontStatus = firstNonEmpty(customFields.personalizationStatus, 'not-required') ?? 'not-required';
        const backStatus = firstNonEmpty(customFields.personalizationBackStatus, 'not-required') ?? 'not-required';
        const frontSide = buildSide(
            'front',
            'Frente',
            frontMode,
            frontStatus,
            firstNonEmpty(customFields.frontText),
            firstNonEmpty(customFields.personalizationUploadedAt),
            firstNonEmpty(customFields.personalizationSnapshotFileName),
            customFields.personalizationAsset,
        );
        const sides = [frontSide];

        if (
            backMode !== 'none' ||
            firstNonEmpty(customFields.backText) ||
            firstNonEmpty(customFields.personalizationBackAsset?.source, customFields.personalizationBackAsset?.preview)
        ) {
            sides.push(buildSide(
                'back',
                'Dorso',
                backMode,
                backStatus,
                firstNonEmpty(customFields.backText),
                firstNonEmpty(customFields.personalizationBackUploadedAt),
                firstNonEmpty(customFields.personalizationBackSnapshotFileName),
                customFields.personalizationBackAsset,
            ));
        }

        const requiresPersonalization = line?.productVariant?.customFields?.requiresPersonalization === true;

        return {
            id: String(line?.id ?? ''),
            quantity: Number(line?.quantity ?? 0),
            productName: firstNonEmpty(line?.productVariant?.product?.name, 'Producto') ?? 'Producto',
            variantName: firstNonEmpty(line?.productVariant?.name, 'Variante') ?? 'Variante',
            requiresPersonalization,
            personalizationStatus: getLineStatus(requiresPersonalization, sides),
            personalizationNotes: firstNonEmpty(customFields.personalizationNotes),
            personalizationUploadedAt: firstNonEmpty(customFields.personalizationUploadedAt),
            personalizationApprovedAt: firstNonEmpty(customFields.personalizationApprovedAt),
            personalizationSnapshotFileName: firstNonEmpty(customFields.personalizationSnapshotFileName),
            personalizationAssetPreview: firstNonEmpty(customFields.personalizationAsset?.preview),
            personalizationAssetSource: firstNonEmpty(customFields.personalizationAsset?.source),
            sides,
        };
    });

    const required = lines.filter(l => l.requiresPersonalization);
    const completed = required.filter(l => isCompletedLineStatus(l.personalizationStatus));
    const copy = getPersonalizationCopy(required.length, completed.length);

    return {
        personalizationRequired: required.length > 0,
        personalizationTone: copy.tone,
        personalizationLabel: copy.label,
        personalizationDescription: copy.description,
        personalizationRequiredCount: required.length,
        personalizationCompletedCount: completed.length,
        personalizationPendingCount: required.length - completed.length,
        lines,
    };
}
