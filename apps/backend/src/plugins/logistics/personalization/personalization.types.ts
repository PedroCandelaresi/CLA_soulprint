export type PersonalizationStatus = 'not-required' | 'pending' | 'uploaded';

export interface PersonalizationOrderAccess {
    orderCode: string;
    transactionId?: string;
    accessToken?: string;
    customerUserId?: string;
}

export interface PersonalizationUploadInput extends PersonalizationOrderAccess {
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

export interface PersonalizationOrderData {
    orderCode: string;
    requiresPersonalization: boolean;
    personalizationStatus: PersonalizationStatus;
    paymentState: string;
    shipmentState: string | null;
    trackingNumber: string | null;
    originalFilename: string | null;
    uploadedAt: string | null;
    notes: string | null;
    accessToken?: string;
    asset: PersonalizationAssetSummary | null;
    requiredItems: Array<{
        orderLineId: string;
        productName: string;
        variantName: string;
    }>;
}
