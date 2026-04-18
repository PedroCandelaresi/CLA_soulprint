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

export interface PersonalizationOrderAccess {
    orderCode: string;
    transactionId?: string;
    accessToken?: string;
    customerUserId?: string;
}

export interface PersonalizationLineUploadInput extends PersonalizationOrderAccess {
    orderLineId: string;
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
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationLineStatus;
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
