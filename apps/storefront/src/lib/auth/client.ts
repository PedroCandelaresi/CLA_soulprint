import type {
    ActiveCustomerResponse,
    AuthActionResponse,
    CustomerDashboardResponse,
    CustomerOrderDetailResponse,
} from '@/types/customer-account';

const AUTH_API_BASE = '/api/auth';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo completar la solicitud.';
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${AUTH_API_BASE}${path}`, {
        ...init,
        cache: 'no-store',
        credentials: 'include',
        headers: {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...init?.headers,
        },
    });

    const payload = await response.json() as T & { error?: string };
    if (!response.ok && payload && typeof payload === 'object' && 'error' in payload && payload.error) {
        throw new Error(payload.error);
    }

    return payload;
}

export async function login(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
}): Promise<AuthActionResponse> {
    try {
        return await requestJson<AuthActionResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function register(input: {
    email: string;
    fullName: string;
    phoneNumber?: string;
}): Promise<AuthActionResponse> {
    try {
        return await requestJson<AuthActionResponse>('/register', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function logout(): Promise<AuthActionResponse> {
    try {
        return await requestJson<AuthActionResponse>('/logout', {
            method: 'POST',
        });
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function verifyAccount(input: {
    token: string;
    password: string;
}): Promise<AuthActionResponse> {
    try {
        return await requestJson<AuthActionResponse>('/verify', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getActiveCustomer(): Promise<ActiveCustomerResponse> {
    try {
        return await requestJson<ActiveCustomerResponse>('/me');
    } catch (error) {
        return {
            success: false,
            customer: null,
            error: getErrorMessage(error),
        };
    }
}

export async function getCustomerDashboard(): Promise<CustomerDashboardResponse> {
    try {
        return await requestJson<CustomerDashboardResponse>('/dashboard');
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getCustomerOrder(orderCode: string): Promise<CustomerOrderDetailResponse> {
    try {
        return await requestJson<CustomerOrderDetailResponse>(`/orders/${encodeURIComponent(orderCode)}`);
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateCustomerProfile(input: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    documentNumber?: string;
}): Promise<AuthActionResponse> {
    try {
        return await requestJson<AuthActionResponse>('/profile', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    } catch (error) {
        return { success: false, error: getErrorMessage(error) };
    }
}
