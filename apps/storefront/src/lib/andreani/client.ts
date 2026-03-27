import type {
    AndreaniQuoteRequest,
    AndreaniQuoteResponse,
    AndreaniSelectionRequest,
    AndreaniSelectionResponse,
    AndreaniOrderLogisticsResponse,
} from './types';

const QUOTE_API = '/api/logistics/andreani/quote';
const SELECTION_API = '/api/logistics/andreani/selection';
const ORDER_LOGISTICS_API = (orderCode: string) => `/api/logistics/andreani/order/${encodeURIComponent(orderCode)}`;

async function postJson<T extends { success: boolean }>(url: string, payload: unknown): Promise<T> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        });

        const parsed = await response.json().catch(() => null);

        if (!response.ok) {
            return (
                {
                    success: false,
                    error: parsed?.error || 'No se pudo completar la solicitud.',
                } as T
            );
        }

        if (!parsed) {
            return ({ success: false, error: 'Respuesta vacía del servidor.' } as T);
        }

        return parsed as T;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado al conectar con Andreani.';
        return ({ success: false, error: message } as T);
    }
}

export async function quoteAndreani(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResponse> {
    return postJson<AndreaniQuoteResponse>(QUOTE_API, payload);
}

export async function saveAndreaniSelection(payload: AndreaniSelectionRequest): Promise<AndreaniSelectionResponse> {
    return postJson<AndreaniSelectionResponse>(SELECTION_API, payload);
}

export async function getAndreaniOrderLogistics(orderCode: string): Promise<AndreaniOrderLogisticsResponse> {
    if (!orderCode) {
        return { success: false, error: 'Se requiere el código de orden para consultar Andreani.' };
    }

    try {
        const response = await fetch(ORDER_LOGISTICS_API(orderCode), {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
        });

        const parsed = await response.json().catch(() => null);

        if (!response.ok) {
            return {
                success: false,
                error: parsed?.error || 'No se pudo obtener la información logística de Andreani.',
            };
        }

        if (!parsed) {
            return { success: false, error: 'Respuesta vacía del backend de Andreani.' };
        }

        return parsed as AndreaniOrderLogisticsResponse;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado al consultar Andreani.';
        return { success: false, error: message };
    }
}
