export type PersonalizationLineStatus =
    | 'not-required'
    | 'pending-upload'
    | 'uploaded'
    | 'approved'
    | 'rejected';

export type PersonalizationOverallStatus =
    | 'not-required'
    | 'pending'
    | 'partial'
    | 'complete';

export interface PersonalizationAssetSummary {
    id: string;
    source: string;
    preview: string;
    mimeType: string;
    fileSize: number;
}

export type PersonalizationSideMode = 'text' | 'image';
export type PersonalizationBackMode = 'none' | 'text' | 'image';

export interface PersonalizationLineData {
    orderLineId: string;
    productName: string;
    variantName: string;
    quantity: number;
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationLineStatus;
    // Frente
    frontMode: PersonalizationSideMode;
    frontText: string | null;
    frontAsset: PersonalizationAssetSummary | null;
    frontUploadedAt: string | null;
    frontSnapshotFileName: string | null;
    // Dorso
    backMode: PersonalizationBackMode;
    backText: string | null;
    backAsset: PersonalizationAssetSummary | null;
    backStatus: PersonalizationLineStatus;
    backUploadedAt: string | null;
    backSnapshotFileName: string | null;
    // Legacy
    asset: PersonalizationAssetSummary | null;
    notes: string | null;
    uploadedAt: string | null;
    snapshotFileName: string | null;
}

export interface PersonalizationOrderData {
    orderCode: string;
    requiresPersonalization: boolean;
    overallPersonalizationStatus: PersonalizationOverallStatus;
    paymentState: string;
    shipmentState: string | null;
    trackingNumber: string | null;
    accessToken: string;
    lines: PersonalizationLineData[];
}

export interface PersonalizationAccessInput {
    transactionId?: string | null;
    accessToken?: string | null;
}

