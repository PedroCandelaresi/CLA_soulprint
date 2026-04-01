export type PersonalizationLineStatus =
    | 'not-required'
    | 'pending-upload'
    | 'uploaded'
    | 'approved'
    | 'rejected';

// ─── Access / Input ───────────────────────────────────────────────────────────

export interface PersonalizationOrderAccess {
    orderCode: string;
    transactionId?: string;
    accessToken?: string;
    customerUserId?: string;
}

/** Input for uploading to a specific OrderLine */
export interface PersonalizationLineUploadInput extends PersonalizationOrderAccess {
    orderLineId: string;
    notes?: string;
    file: UploadedPersonalizationFile;
}

/** Kept for backward-compat with existing controller; maps to uploadForLine internally */
export interface PersonalizationUploadInput extends PersonalizationOrderAccess {
    orderLineId?: string;
    notes?: string;
    file: UploadedPersonalizationFile;
}

export interface UploadedPersonalizationFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

// ─── Response ─────────────────────────────────────────────────────────────────

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
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationLineStatus;
    asset: PersonalizationAssetSummary | null;
    notes: string | null;
    uploadedAt: string | null;
    snapshotFileName: string | null;
}

export interface PersonalizationOrderData {
    orderCode: string;
    overallPersonalizationStatus: string; // 'not-required' | 'pending' | 'partial' | 'complete'
    paymentState: string;
    shipmentState: string | null;
    trackingNumber: string | null;
    accessToken: string;
    lines: PersonalizationLineData[];
}
