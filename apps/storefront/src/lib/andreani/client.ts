import type {
    AndreaniQuoteRequest,
    AndreaniQuoteResponse,
    AndreaniSelectionRequest,
    AndreaniSelectionResponse,
    AndreaniOrderLogisticsResponse,
    AndreaniQuoteSuccessResponse,
    AndreaniSelectionSuccessResponse,
    AndreaniOrderLogisticsSuccessResponse,
    AndreaniApiErrorResponse,
} from './types';

const QUOTE_API = '/api/logistics/andreani/quote';
const SELECTION_API = '/api/logistics/andreani/selection';
const ORDER_LOGISTICS_API = (orderCode: string) => `/api/logistics/andreani/order/${encodeURIComponent(orderCode)}`;

type AndréaniParsedResponse = { success?: boolean; error?: string } | null;

function buildErrorResponse(message: string): AndreaniApiErrorResponse {
    return {
        success: false,
        error: message,
    };
}

async function postJson<TSuccess>(url: string, payload: unknown): Promise<TSuccess | AndreaniApiErrorResponse> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        });

        const parsed = (await response.json().catch(() => null)) as AndréaniParsedResponse;

        if (!response.ok) {
            return buildErrorResponse(parsed?.error || 'No se pudo completar la solicitud.');
        }

        if (!parsed) {
            return buildErrorResponse('Respuesta vacía del servidor.');
        }

        if (parsed.success === false) {
            return buildErrorResponse(parsed.error || 'La solicitud a Andreani falló.');
        }

        return parsed as TSuccess;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado al conectar con Andreani.';
        return buildErrorResponse(message);
    }
}

async function getJson<TSuccess>(url: string): Promise<TSuccess | AndreaniApiErrorResponse> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
        });

        const parsed = (await response.json().catch(() => null)) as AndréaniParsedResponse;

        if (!response.ok) {
            return buildErrorResponse(parsed?.error || 'No se pudo obtener la información logística de Andreani.');
        }

        if (!parsed) {
            return buildErrorResponse('Respuesta vacía del backend de Andreani.');
        }

        if (parsed.success === false) {
            return buildErrorResponse(parsed.error || 'No se pudo obtener la información logística de Andreani.');
        }

        return parsed as TSuccess;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado al consultar Andreani.';
        return buildErrorResponse(message);
    }
}
export async function quoteAndreani(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResponse> {
    return postJson<AndreaniQuoteSuccessResponse>(QUOTE_API, payload);
}

export async function saveAndreaniSelection(payload: AndreaniSelectionRequest): Promise<AndreaniSelectionResponse> {
    return postJson<AndreaniSelectionSuccessResponse>(SELECTION_API, payload);
}

export async function getAndreaniOrderLogistics(orderCode: string): Promise<AndreaniOrderLogisticsResponse> {
    if (!orderCode) {
        return buildErrorResponse('Se requiere el código de orden para consultar Andreani.');
    }

    return getJson<AndreaniOrderLogisticsSuccessResponse>(ORDER_LOGISTICS_API(orderCode));
}
