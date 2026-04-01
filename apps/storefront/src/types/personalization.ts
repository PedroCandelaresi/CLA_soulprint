export type PersonalizationLineStatusValue =
    | 'not-required'
    | 'pending-upload'
    | 'uploaded'
    | 'approved'
    | 'rejected';

export type PersonalizationStatusValue =
    | 'not-required'
    | 'pending'
    | 'uploaded';

export type PersonalizationOverallStatusValue =
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

export interface PersonalizationLineSummary {
    orderLineId: string;
    productName: string;
    variantName: string;
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationLineStatusValue;
    asset: PersonalizationAssetSummary | null;
    notes: string | null;
    uploadedAt: string | null;
    snapshotFileName: string | null;
}

export interface PersonalizationOrderResponseData {
    orderCode: string;
    requiresPersonalization: boolean;
    overallPersonalizationStatus: PersonalizationOverallStatusValue;
    paymentState: string;
    shipmentState: string | null;
    trackingNumber: string | null;
    accessToken?: string;
    lines: PersonalizationLineSummary[];
}

export interface PersonalizationApiResponse {
    success: boolean;
    data?: PersonalizationOrderResponseData;
    error?: string;
}

export interface PersonalizationUploadResponse {
    success: boolean;
    data?: PersonalizationOrderResponseData;
    error?: string;
}
