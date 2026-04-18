'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    deleteCustomerAddress,
    getCustomerAccountData,
    getCustomerOrderDetail,
    requestCustomerEmailChange,
    saveCustomerAddress,
    updateCustomerPassword,
    updateCustomerProfile,
} from '@/lib/vendure/account';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import type {
    AccountCustomer,
    CustomerAccountData,
    CustomerAddressInput,
    CustomerOrderDetail,
    CustomerOrderSummary,
    OperationResult,
    StorefrontCountry,
    UpdateCustomerPasswordInput,
    UpdateCustomerProfileInput,
} from '@/types/storefront';

type CustomerAccountContextValue = {
    customer: AccountCustomer | null;
    availableCountries: StorefrontCountry[];
    orders: CustomerOrderSummary[];
    recentOrders: CustomerOrderSummary[];
    accountLoading: boolean;
    accountError: string | null;
    refreshAccount: () => Promise<void>;
    updateProfile: (input: UpdateCustomerProfileInput) => Promise<OperationResult>;
    requestEmailChange: (input: {
        password: string;
        newEmailAddress: string;
    }) => Promise<OperationResult>;
    changePassword: (input: UpdateCustomerPasswordInput) => Promise<OperationResult>;
    saveAddress: (input: CustomerAddressInput) => Promise<OperationResult>;
    deleteAddress: (id: string) => Promise<OperationResult>;
    orderDetails: Record<string, CustomerOrderDetail | null>;
    orderDetailLoading: Record<string, boolean>;
    loadOrderDetail: (code: string, options?: { force?: boolean }) => Promise<CustomerOrderDetail | null>;
};

const CustomerAccountContext = createContext<CustomerAccountContextValue | undefined>(undefined);

type CustomerAccountProviderProps = {
    children: ReactNode;
    initialData?: CustomerAccountData | null;
    initialError?: string | null;
};

export function CustomerAccountProvider({
    children,
    initialData,
    initialError = null,
}: CustomerAccountProviderProps) {
    const { initialized, isAuthenticated, refreshState } = useStorefront();
    const [customer, setCustomer] = useState<AccountCustomer | null>(initialData?.customer ?? null);
    const [availableCountries, setAvailableCountries] = useState<StorefrontCountry[]>(
        initialData?.availableCountries ?? [],
    );
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountError, setAccountError] = useState<string | null>(initialError);
    const [orderDetails, setOrderDetails] = useState<Record<string, CustomerOrderDetail | null>>({});
    const [orderDetailLoading, setOrderDetailLoading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setCustomer(initialData?.customer ?? null);
        setAvailableCountries(initialData?.availableCountries ?? []);
        setAccountError(initialError);
    }, [initialData, initialError]);

    const refreshAccount = useCallback(async () => {
        if (!isAuthenticated) {
            setCustomer(null);
            setAvailableCountries([]);
            setAccountError(null);
            return;
        }

        setAccountLoading(true);
        setAccountError(null);

        try {
            const data = await getCustomerAccountData();
            setCustomer(data.customer);
            setAvailableCountries(data.availableCountries);
        } catch (error) {
            console.error('No se pudo cargar el centro de cuenta', error);
            setAccountError('No pudimos cargar tu cuenta. Probá nuevamente en unos segundos.');
        } finally {
            setAccountLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!initialized) {
            return;
        }

        if (!isAuthenticated) {
            setCustomer(null);
            setAvailableCountries([]);
            setOrderDetails({});
            setOrderDetailLoading({});
            setAccountLoading(false);
            setAccountError(null);
            return;
        }

        if (!initialData?.customer) {
            void refreshAccount();
        }
    }, [initialData?.customer, initialized, isAuthenticated, refreshAccount]);

    const updateProfileAction = useCallback(
        async (input: UpdateCustomerProfileInput): Promise<OperationResult> => {
            const result = await updateCustomerProfile(input);

            if (result.success) {
                await Promise.all([refreshState(), refreshAccount()]);
            }

            return result;
        },
        [refreshAccount, refreshState],
    );

    const requestEmailChangeAction = useCallback(
        async (input: { password: string; newEmailAddress: string }): Promise<OperationResult> =>
            requestCustomerEmailChange(input),
        [],
    );

    const changePasswordAction = useCallback(
        async (input: UpdateCustomerPasswordInput): Promise<OperationResult> =>
            updateCustomerPassword(input),
        [],
    );

    const saveAddressAction = useCallback(
        async (input: CustomerAddressInput): Promise<OperationResult> => {
            const result = await saveCustomerAddress(input);

            if (result.success) {
                await refreshAccount();
            }

            return result;
        },
        [refreshAccount],
    );

    const deleteAddressAction = useCallback(
        async (id: string): Promise<OperationResult> => {
            const result = await deleteCustomerAddress(id);

            if (result.success) {
                await refreshAccount();
            }

            return result;
        },
        [refreshAccount],
    );

    const loadOrderDetail = useCallback(
        async (code: string, options?: { force?: boolean }): Promise<CustomerOrderDetail | null> => {
            const trimmedCode = code.trim();
            if (!trimmedCode) {
                return null;
            }

            if (!options?.force && trimmedCode in orderDetails) {
                return orderDetails[trimmedCode] ?? null;
            }

            setOrderDetailLoading((prev) => ({
                ...prev,
                [trimmedCode]: true,
            }));

            try {
                const order = await getCustomerOrderDetail(trimmedCode);
                setOrderDetails((prev) => ({
                    ...prev,
                    [trimmedCode]: order,
                }));
                return order;
            } catch (error) {
                console.error(`No se pudo cargar el pedido ${trimmedCode}`, error);
                setOrderDetails((prev) => ({
                    ...prev,
                    [trimmedCode]: null,
                }));
                return null;
            } finally {
                setOrderDetailLoading((prev) => ({
                    ...prev,
                    [trimmedCode]: false,
                }));
            }
        },
        [orderDetails],
    );

    const value = useMemo<CustomerAccountContextValue>(() => {
        const orders = customer?.orders ?? [];

        return {
            customer,
            availableCountries,
            orders,
            recentOrders: orders.slice(0, 4),
            accountLoading,
            accountError,
            refreshAccount,
            updateProfile: updateProfileAction,
            requestEmailChange: requestEmailChangeAction,
            changePassword: changePasswordAction,
            saveAddress: saveAddressAction,
            deleteAddress: deleteAddressAction,
            orderDetails,
            orderDetailLoading,
            loadOrderDetail,
        };
    }, [
        accountError,
        accountLoading,
        availableCountries,
        changePasswordAction,
        customer,
        deleteAddressAction,
        loadOrderDetail,
        orderDetailLoading,
        orderDetails,
        refreshAccount,
        requestEmailChangeAction,
        saveAddressAction,
        updateProfileAction,
    ]);

    return <CustomerAccountContext.Provider value={value}>{children}</CustomerAccountContext.Provider>;
}

export function useCustomerAccount() {
    const context = useContext(CustomerAccountContext);

    if (!context) {
        throw new Error('useCustomerAccount debe usarse dentro de CustomerAccountProvider');
    }

    return context;
}
