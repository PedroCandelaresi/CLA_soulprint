'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';
import { getActiveCustomer, logout as logoutRequest } from '@/lib/auth/client';
import type { CustomerSummary } from '@/types/customer-account';

interface CustomerContextValue {
    customer: CustomerSummary | null;
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
    const [customer, setCustomer] = useState<CustomerSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCustomer = useEffectEvent(async () => {
        try {
            const response = await getActiveCustomer();
            if (!response.success) {
                setCustomer(null);
                setError(response.error || null);
                return;
            }

            setCustomer(response.customer);
            setError(null);
        } catch (loadError) {
            setCustomer(null);
            setError(getErrorMessage(loadError));
        } finally {
            setIsLoading(false);
        }
    });

    useEffect(() => {
        void loadCustomer();
    }, []);

    async function refreshCustomer(): Promise<void> {
        setCustomer(null);
        setError(null);
        setIsLoading(true);
        await loadCustomer();
    }

    async function logout(): Promise<boolean> {
        const response = await logoutRequest();
        if (!response.success) {
            setError(response.error || 'No se pudo cerrar la sesión.');
            return false;
        }

        setCustomer(null);
        setError(null);
        return true;
    }

    return (
        <CustomerContext.Provider
            value={{
                customer,
                isLoading,
                error,
                isAuthenticated: Boolean(customer),
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
