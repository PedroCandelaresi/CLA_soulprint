import type {
    PersonalizationApiResponse,
    PersonalizationUploadResponse,
} from '@/types/personalization';

const PERSONALIZATION_API_BASE = '/api/logistics/personalization';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'No se pudo procesar la solicitud.';
}

export const personalizationStorage = {
    getAccessToken(orderCode: string): string | null {
        if (typeof window === 'undefined') {
            return null;
        }
        return sessionStorage.getItem(`personalization_access_token:${orderCode}`);
    },
    setAccessToken(orderCode: string, token: string): void {
        if (typeof window === 'undefined') {
            return;
        }
        sessionStorage.setItem(`personalization_access_token:${orderCode}`, token);
    },
};

function buildQuery(params: Record<string, string | undefined>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            searchParams.set(key, value);
        }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

export async function getOrderPersonalization(input: {
    orderCode: string;
    transactionId?: string;
    accessToken?: string;
}): Promise<PersonalizationApiResponse> {
    try {
        const query = buildQuery({
            transactionId: input.transactionId,
            accessToken: input.accessToken,
        });

        const response = await fetch(
            `${PERSONALIZATION_API_BASE}/order/${encodeURIComponent(input.orderCode)}${query}`,
            {
                cache: 'no-store',
                credentials: 'include',
            },
        );

        const payload = await response.json() as PersonalizationApiResponse;
        if (!response.ok || !payload.success) {
            return {
                success: false,
                error: payload.error || 'No se pudo consultar la personalización del pedido.',
            };
        }
        return payload;
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function uploadOrderPersonalization(input: {
    orderCode: string;
    file: File;
    notes?: string;
    transactionId?: string;
    accessToken?: string;
}): Promise<PersonalizationUploadResponse> {
    try {
        const formData = new FormData();
        formData.set('orderCode', input.orderCode);
        formData.set('file', input.file);
        if (input.notes) {
            formData.set('notes', input.notes);
        }
        if (input.transactionId) {
            formData.set('transactionId', input.transactionId);
        }
        if (input.accessToken) {
            formData.set('accessToken', input.accessToken);
        }

        const response = await fetch(`${PERSONALIZATION_API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        const payload = await response.json() as PersonalizationUploadResponse;
        if (!response.ok || !payload.success) {
            return {
                success: false,
                error: payload.error || 'No se pudo subir el archivo.',
            };
        }
        return payload;
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}
