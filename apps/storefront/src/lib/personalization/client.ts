import type {
    PersonalizationAccessInput,
    PersonalizationOrderData,
} from './types';

type PersonalizationApiResponse = {
    success: boolean;
    data?: PersonalizationOrderData;
    error?: string;
};

export type UploadPersonalizationInput = PersonalizationAccessInput & {
    orderCode: string;
    orderLineId: string;
    file: File;
    notes?: string;
};

function appendAccessParams(params: URLSearchParams, access?: PersonalizationAccessInput) {
    const transactionId = access?.transactionId?.trim();
    const accessToken = access?.accessToken?.trim();

    if (transactionId) {
        params.set('transactionId', transactionId);
    }
    if (accessToken) {
        params.set('accessToken', accessToken);
    }
}

function getErrorMessage(payload: PersonalizationApiResponse | null, fallback: string): string {
    return payload?.error?.trim() || fallback;
}

async function parsePersonalizationResponse(
    response: Response,
    fallback: string,
): Promise<PersonalizationOrderData> {
    const payload = (await response.json().catch(() => null)) as PersonalizationApiResponse | null;

    if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(getErrorMessage(payload, fallback));
    }

    return payload.data;
}

export async function fetchPersonalizationOrder(
    orderCode: string,
    access?: PersonalizationAccessInput,
): Promise<PersonalizationOrderData> {
    const params = new URLSearchParams();
    appendAccessParams(params, access);
    const queryString = params.toString();
    const response = await fetch(
        `/api/personalization/order/${encodeURIComponent(orderCode)}${queryString ? `?${queryString}` : ''}`,
        {
            cache: 'no-store',
        },
    );

    return parsePersonalizationResponse(
        response,
        'No pudimos consultar si este pedido requiere personalización.',
    );
}

export async function uploadPersonalizationFile(
    input: UploadPersonalizationInput,
): Promise<PersonalizationOrderData> {
    const formData = new FormData();
    formData.set('orderCode', input.orderCode);
    formData.set('orderLineId', input.orderLineId);
    formData.set('file', input.file);

    if (input.notes?.trim()) {
        formData.set('notes', input.notes.trim());
    }
    if (input.transactionId?.trim()) {
        formData.set('transactionId', input.transactionId.trim());
    }
    if (input.accessToken?.trim()) {
        formData.set('accessToken', input.accessToken.trim());
    }

    const response = await fetch('/api/personalization/upload', {
        method: 'POST',
        body: formData,
    });

    return parsePersonalizationResponse(
        response,
        'No pudimos subir el archivo de personalización.',
    );
}

