export type MercadoPagoPreferenceResult = 'success' | 'failure' | 'pending';
export type MercadoPagoEnvironment = 'testing' | 'production';
export type MercadoPagoWebhookDecision =
    | 'settled'
    | 'kept_authorized_pending'
    | 'declined'
    | 'cancelled'
    | 'ignored_duplicate'
    | 'ignored_terminal_conflict'
    | 'ignored_invalid_reference'
    | 'ignored_order_not_found'
    | 'ignored_unmatched_payment'
    | 'ignored_unknown_status'
    | 'amount_mismatch';

export interface MercadoPagoPreferenceItem {
    id?: string;
    title: string;
    description?: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
}

export interface MercadoPagoCreatePreferenceRequest {
    items: MercadoPagoPreferenceItem[];
    external_reference: string;
    notification_url: string;
    back_urls: Record<MercadoPagoPreferenceResult, string>;
    auto_return: 'approved';
    payer?: {
        email?: string;
        name?: string;
        surname?: string;
    };
    metadata?: Record<string, unknown>;
}

export interface MercadoPagoCreatePreferenceResponse {
    id: string;
    init_point?: string | null;
    sandbox_init_point?: string | null;
    external_reference?: string | null;
}

export interface MercadoPagoPaymentOrderReference {
    id?: number | string;
}

export interface MercadoPagoPaymentResponse {
    id: number | string;
    status: string;
    status_detail?: string | null;
    external_reference?: string | null;
    preference_id?: string | null;
    payment_method_id?: string | null;
    payment_type_id?: string | null;
    date_created?: string | null;
    date_last_updated?: string | null;
    date_approved?: string | null;
    transaction_amount?: number | null;
    order?: MercadoPagoPaymentOrderReference | null;
}

export interface MercadoPagoWebhookPayload {
    action?: string;
    api_version?: string;
    date_created?: string;
    id?: number | string;
    live_mode?: boolean;
    topic?: string;
    type?: string;
    data?: {
        id?: number | string;
    } | null;
}

export interface MercadoPagoPaymentMetadataPublic {
    environment: MercadoPagoEnvironment;
    externalReference: string;
    preferenceId?: string;
    initPoint?: string | null;
    sandboxInitPoint?: string | null;
    paymentId?: string;
    status?: string;
    statusDetail?: string;
    preferenceCreatedAt?: string | null;
    lastValidatedAt?: string | null;
    lastDecision?: MercadoPagoWebhookDecision;
    amountMatches?: boolean;
}

export interface MercadoPagoPaymentMetadata {
    provider: 'mercadopago';
    environment: MercadoPagoEnvironment;
    externalReference: string;
    preferenceId?: string;
    initPoint?: string | null;
    sandboxInitPoint?: string | null;
    paymentId?: string;
    merchantOrderId?: string | null;
    status?: string;
    statusDetail?: string;
    paymentMethodId?: string | null;
    paymentTypeId?: string | null;
    notificationUrl?: string;
    backUrls?: Record<MercadoPagoPreferenceResult, string>;
    preferenceCreatedAt?: string | null;
    expectedAmount?: number;
    expectedAmountMinor?: number;
    receivedAmount?: number | null;
    receivedAmountMinor?: number | null;
    amountMatches?: boolean;
    lastValidatedAt?: string | null;
    lastWebhookAt?: string | null;
    lastWebhookTopic?: string | null;
    lastWebhookAction?: string | null;
    lastDecision?: MercadoPagoWebhookDecision;
    retryCount?: number;
    retriedFromPaymentId?: string | null;
    public: MercadoPagoPaymentMetadataPublic;
    [key: string]: unknown;
}

export interface MercadoPagoWebhookRequest {
    body: MercadoPagoWebhookPayload;
    query: Record<string, unknown>;
    signatureHeader?: string;
    requestIdHeader?: string;
}
