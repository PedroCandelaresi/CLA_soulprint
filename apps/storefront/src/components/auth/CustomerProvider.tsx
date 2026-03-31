'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';
import { getActiveCustomer, logout as logoutRequest } from '@/lib/auth/client';
import type { CustomerSummary } from '@/types/customer-account';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

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
        setCustomerState(nextCustomer);
        setAuthStatus(nextCustomer ? 'authenticated' : 'guest');
    }

    const loadCustomer = useEffectEvent(async () => {
        try {
            const response = await getActiveCustomer();
            if (!response.success) {
                setCustomerState(null);
                setAuthStatus('guest');
                setError(response.error || null);
                return;
            }

            setCustomerState(response.customer);
            setAuthStatus(response.customer ? 'authenticated' : 'guest');
            setError(null);
        } catch (loadError) {
            setCustomerState(null);
            setAuthStatus('guest');
            setError(getErrorMessage(loadError));
        }
    });

    useEffect(() => {
        void loadCustomer();
    }, []);

    async function refreshCustomer(): Promise<void> {
        setError(null);
        setAuthStatus('loading');
        await loadCustomer();
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
