export type PersonalizationStatusValue = 'not-required' | 'pending' | 'uploaded';

export interface PersonalizationOrderResponseData {
    orderCode: string;
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationStatusValue;
    paymentState: string;
    shipmentState: string | null;
    trackingNumber: string | null;
    originalFilename: string | null;
    uploadedAt: string | null;
    notes: string | null;
    accessToken?: string;
    assetId: string | null;
    assetUrl: string | null;
    assetPreviewUrl: string | null;
    assetMimeType: string | null;
    assetFileSize: number | null;
    requiredItems: Array<{
        orderLineId: string;
        productName: string;
        variantName: string;
    }>;
}

export interface PersonalizationApiResponse {
    success: boolean;
    data?: PersonalizationOrderResponseData;
    error?: string;
}

export interface PersonalizationUploadResponse {
    success: boolean;
    data?: {
        orderCode: string;
        personalizationStatus: PersonalizationStatusValue;
        assetId: string | null;
        assetUrl: string | null;
        assetPreviewUrl: string | null;
        assetMimeType: string | null;
        assetFileSize: number | null;
        originalFilename: string | null;
        uploadedAt: string | null;
        notes: string | null;
        accessToken?: string;
    };
    error?: string;
}
