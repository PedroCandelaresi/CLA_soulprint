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

export type PersonalizationSide = 'front' | 'back';

export type PersonalizationSideMode = 'text' | 'image';

export type PersonalizationBackMode = 'none' | 'text' | 'image';

export interface PersonalizationOrderAccess {
    orderCode: string;
    transactionId?: string;
    accessToken?: string;
    customerUserId?: string;
}

export interface PersonalizationLineUploadInput extends PersonalizationOrderAccess {
    orderLineId: string;
    side: PersonalizationSide;
    notes?: string;
    file: UploadedPersonalizationFile;
}

export interface UploadedPersonalizationFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface PersonalizationAssetSummary {
    id: string;
    source: string;
    preview: string;
    mimeType: string;
    fileSize: number;
}

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
    // Legacy (kept for backwards compat)
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
