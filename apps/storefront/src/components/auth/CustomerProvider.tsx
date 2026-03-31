'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';
import { getActiveCustomer, logout as logoutRequest } from '@/lib/auth/client';
import type { CustomerSummary } from '@/types/customer-account';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error';

interface CustomerContextValue {
    customer: CustomerSummary | null;
    authStatus: AuthStatus;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    refreshCustomer: () => Promise<void>;
    setCustomer: (customer: CustomerSummary | null) => void;
    logout: () => Promise<boolean>;
    clearError: () => void;
}

const CustomerContext = createContext<CustomerContextValue | undefined>(undefined);

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo actualizar la sesión.';
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
    const [customer, setCustomerState] = useState<CustomerSummary | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
    const [error, setError] = useState<string | null>(null);

    function setCustomer(nextCustomer: CustomerSummary | null): void {
        console.info(
            `[auth:provider] setCustomer nextCustomer=${nextCustomer?.id ?? 'null'} nextStatus=${nextCustomer ? 'authenticated' : 'guest'}`,
        );
        setCustomerState(nextCustomer);
        setAuthStatus(nextCustomer ? 'authenticated' : 'guest');
    }

    const loadCustomer = useEffectEvent(async () => {
        console.info('[auth:provider] loadCustomer:start');
        try {
            const response = await getActiveCustomer();
            console.info(
                `[auth:provider] loadCustomer:response success=${response.success} customer=${response.customer?.id ?? 'null'} error=${response.error || '(none)'}`,
            );
            if (!response.success) {
                setAuthStatus((currentStatus) => (currentStatus === 'authenticated' && customer ? 'authenticated' : 'error'));
                setError(response.error || 'No se pudo validar la sesión.');
                console.info(
                    `[auth:provider] loadCustomer:transition ${customer ? 'authenticated (stale)' : 'error'} (response not successful)`,
                );
                return;
            }

            setCustomerState(response.customer);
            setAuthStatus(response.customer ? 'authenticated' : 'guest');
            setError(null);
            console.info(
                `[auth:provider] loadCustomer:transition ${response.customer ? 'authenticated' : 'guest'}`,
            );
        } catch (loadError) {
            setAuthStatus((currentStatus) => (currentStatus === 'authenticated' && customer ? 'authenticated' : 'error'));
            setError(getErrorMessage(loadError));
            console.error(
                `[auth:provider] loadCustomer:catch -> ${customer ? 'authenticated (stale)' : 'error'}`,
                loadError,
            );
        }
    });

    useEffect(() => {
        void loadCustomer();
    }, []);

    useEffect(() => {
        console.info(
            `[auth:provider] state authStatus=${authStatus} customer=${customer?.id ?? 'null'} error=${error || '(none)'}`,
        );
    }, [authStatus, customer?.id, error]);

    async function refreshCustomer(): Promise<void> {
        console.info('[auth:provider] refreshCustomer:start');
        setError(null);
        setAuthStatus('loading');
        await loadCustomer();
        console.info('[auth:provider] refreshCustomer:end');
    }

    async function logout(): Promise<boolean> {
        const response = await logoutRequest();
        if (!response.success) {
            setError(response.error || 'No se pudo cerrar la sesión.');
            return false;
        }

        setCustomerState(null);
        setAuthStatus('guest');
        setError(null);
        return true;
    }

    return (
        <CustomerContext.Provider
            value={{
                customer,
                authStatus,
                isLoading: authStatus === 'loading',
                error,
                isAuthenticated: authStatus === 'authenticated',
                refreshCustomer,
                setCustomer,
                logout,
                clearError: () => setError(null),
            }}
        >
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomer(): CustomerContextValue {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error('useCustomer must be used within a CustomerProvider');
    }

    return context;
}
