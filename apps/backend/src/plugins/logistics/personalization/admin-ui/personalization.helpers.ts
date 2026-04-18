export type OperatorTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

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
        case 'uploaded': return 'Archivo cargado';
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
    const lines: PersonalizationLineView[] = (order?.lines ?? []).map((line: any) => ({
        id: String(line?.id ?? ''),
        quantity: Number(line?.quantity ?? 0),
        productName: firstNonEmpty(line?.productVariant?.product?.name, 'Producto') ?? 'Producto',
        variantName: firstNonEmpty(line?.productVariant?.name, 'Variante') ?? 'Variante',
        requiresPersonalization: line?.productVariant?.customFields?.requiresPersonalization === true,
        personalizationStatus: firstNonEmpty(line?.customFields?.personalizationStatus, 'not-required') ?? 'not-required',
        personalizationNotes: firstNonEmpty(line?.customFields?.personalizationNotes),
        personalizationUploadedAt: firstNonEmpty(line?.customFields?.personalizationUploadedAt),
        personalizationApprovedAt: firstNonEmpty(line?.customFields?.personalizationApprovedAt),
        personalizationSnapshotFileName: firstNonEmpty(line?.customFields?.personalizationSnapshotFileName),
        personalizationAssetPreview: firstNonEmpty(line?.customFields?.personalizationAsset?.preview),
        personalizationAssetSource: firstNonEmpty(line?.customFields?.personalizationAsset?.source),
    }));

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
