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
    ADD_ITEM_TO_ORDER_MUTATION,
    ADJUST_ORDER_LINE_MUTATION,
    fetchShopApi,
    getOperationResultMessage,
    GET_STOREFRONT_STATE_QUERY,
    isActiveOrder,
    isErrorResultLike,
    LOGIN_MUTATION,
    LOGOUT_MUTATION,
    RECOVER_CUSTOMER_ACCESS_MUTATION,
    REQUEST_PASSWORD_RESET_MUTATION,
    REFRESH_CUSTOMER_VERIFICATION_MUTATION,
    RESET_PASSWORD_MUTATION,
    REGISTER_CUSTOMER_MUTATION,
    REMOVE_ORDER_LINE_MUTATION,
    VERIFY_CUSTOMER_MUTATION,
    type LoginResponse,
    type LogoutResponse,
    type OrderMutationResult,
    type RecoverCustomerAccessResponse,
    type RequestPasswordResetResponse,
    type RefreshCustomerVerificationResponse,
    type RegisterResponse,
    type ResetPasswordResponse,
    type StorefrontStateResponse,
    type VerifyResponse,
} from '@/lib/vendure/shop';
import type { ActiveOrder, OperationResult, StorefrontCustomer } from '@/types/storefront';

const REQUIRE_CUSTOMER_VERIFICATION =
    process.env.NEXT_PUBLIC_REQUIRE_CUSTOMER_VERIFICATION === 'true';
const AUTH_SYNC_CHANNEL_NAME = 'storefront-auth-sync';
const AUTH_SYNC_STORAGE_KEY = 'storefront-auth-sync-event';

type AuthSyncEvent = {
    type: 'logout' | 'session-updated';
    source: string;
    at: number;
};

type StorefrontContextValue = {
    activeOrder: ActiveOrder | null;
    cartQuantity: number;
    cartLoading: boolean;
    customer: StorefrontCustomer | null;
    initialized: boolean;
    authLoading: boolean;
    isAuthenticated: boolean;
    refreshState: () => Promise<void>;
    login: (input: { emailAddress: string; password: string; rememberMe: boolean }) => Promise<OperationResult>;
    register: (input: {
        firstName: string;
        lastName: string;
        emailAddress: string;
        password?: string;
    }) => Promise<OperationResult>;
    refreshCustomerVerification: (emailAddress: string) => Promise<OperationResult>;
    recoverCustomerAccess: (emailAddress: string) => Promise<OperationResult>;
    requestPasswordReset: (emailAddress: string) => Promise<OperationResult>;
    verifyCustomer: (input: { token: string; password?: string }) => Promise<OperationResult>;
    resetPassword: (input: { token: string; password: string }) => Promise<OperationResult>;
    logout: () => Promise<OperationResult>;
    addItemToOrder: (productVariantId: string, quantity: number, customFields?: Record<string, unknown>) => Promise<OperationResult>;
    adjustOrderLine: (orderLineId: string, quantity: number) => Promise<OperationResult>;
    removeOrderLine: (orderLineId: string) => Promise<OperationResult>;
};

const StorefrontContext = createContext<StorefrontContextValue | undefined>(undefined);

function isNonNullableOrderResult(value: unknown): value is OrderMutationResult {
    return typeof value === 'object' && value !== null;
}

function isAuthSyncEvent(value: unknown): value is AuthSyncEvent {
    return (
        typeof value === 'object' &&
        value !== null &&
        ((value as AuthSyncEvent).type === 'logout' ||
            (value as AuthSyncEvent).type === 'session-updated') &&
        typeof (value as AuthSyncEvent).source === 'string' &&
        typeof (value as AuthSyncEvent).at === 'number'
    );
}

function broadcastAuthSyncEvent(event: AuthSyncEvent): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
        channel.postMessage(event);
        channel.close();
    }

    try {
        window.localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(event));
        window.localStorage.removeItem(AUTH_SYNC_STORAGE_KEY);
    } catch {
        // This storage write is only a compatibility fallback for cross-tab sync.
    }
}

type StorefrontProviderProps = {
    children: ReactNode;
    initialState?: StorefrontStateResponse | null;
};

export function StorefrontProvider({ children, initialState }: StorefrontProviderProps) {
    const syncSource = useMemo(
        () => `tab-${Math.random().toString(36).slice(2, 10)}`,
        [],
    );
    const [customer, setCustomer] = useState<StorefrontCustomer | null>(
        initialState?.activeCustomer ?? null,
    );
    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(
        initialState?.activeOrder ?? null,
    );
    const [initialized, setInitialized] = useState(Boolean(initialState));
    const [authLoading, setAuthLoading] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);

    const refreshState = useCallback(async () => {
        try {
            const data = await fetchShopApi<StorefrontStateResponse>(GET_STOREFRONT_STATE_QUERY);
            setCustomer(data.activeCustomer ?? null);
            setActiveOrder(data.activeOrder ?? null);
        } catch (error) {
            console.error('No se pudo obtener el estado del storefront', error);
        } finally {
            setInitialized(true);
        }
    }, []);

    useEffect(() => {
        if (!initialState) {
            void refreshState();
        }
    }, [initialState, refreshState]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleSyncEvent = (event: AuthSyncEvent) => {
            if (event.source === syncSource) {
                return;
            }

            if (event.type === 'logout') {
                setCustomer(null);
                setActiveOrder(null);
            }

            void refreshState();
        };

        let channel: BroadcastChannel | null = null;

        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
            channel.onmessage = (messageEvent) => {
                if (isAuthSyncEvent(messageEvent.data)) {
                    handleSyncEvent(messageEvent.data);
                }
            };
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) {
                return;
            }

            try {
                const parsedValue = JSON.parse(event.newValue) as unknown;

                if (isAuthSyncEvent(parsedValue)) {
                    handleSyncEvent(parsedValue);
                }
            } catch {
                // Ignore malformed sync events.
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            channel?.close();
            window.removeEventListener('storage', handleStorage);
        };
    }, [refreshState, syncSource]);

    useEffect(() => {
        if (!initialState) {
            return;
        }

        setCustomer(initialState.activeCustomer ?? null);
        setActiveOrder(initialState.activeOrder ?? null);
        setInitialized(true);
    }, [initialState]);

    const login = useCallback(
        async ({
            emailAddress,
            password,
            rememberMe,
        }: {
            emailAddress: string;
            password: string;
            rememberMe: boolean;
        }): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<LoginResponse>(LOGIN_MUTATION, {
                    emailAddress,
                    password,
                    rememberMe,
                });

                if (isErrorResultLike(data.login) && data.login.errorCode) {
                    return {
                        success: false,
                        message: 'No pudimos iniciar sesión con los datos ingresados.',
                        errorCode: data.login.errorCode || undefined,
                    };
                }

                await refreshState();
                broadcastAuthSyncEvent({
                    type: 'session-updated',
                    source: syncSource,
                    at: Date.now(),
                });
                return { success: true, message: 'Sesión iniciada correctamente.' };
            } catch {
                return {
                    success: false,
                    message: 'No pudimos iniciar sesión con los datos ingresados.',
                };
            } finally {
                setAuthLoading(false);
            }
        },
        [refreshState],
    );

    const register = useCallback(
        async ({
            firstName,
            lastName,
            emailAddress,
            password,
        }: {
            firstName: string;
            lastName: string;
            emailAddress: string;
            password?: string;
        }): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<RegisterResponse>(REGISTER_CUSTOMER_MUTATION, {
                    input: {
                        firstName,
                        lastName,
                        emailAddress,
                        ...(password ? { password } : {}),
                    },
                });

                if (
                    isErrorResultLike(data.registerCustomerAccount) &&
                    data.registerCustomerAccount.errorCode
                ) {
                    return {
                        success: false,
                        message:
                            'No pudimos completar el alta con esos datos. Si el correo puede continuar con una cuenta, te vamos a guiar en el siguiente paso.',
                        errorCode: data.registerCustomerAccount.errorCode || undefined,
                    };
                }

                await refreshState();
                return {
                    success: true,
                    message: REQUIRE_CUSTOMER_VERIFICATION
                        ? 'Cuenta creada correctamente. Revisá tu correo para confirmar la cuenta antes de ingresar.'
                        : 'Cuenta creada correctamente. Ya podés iniciar sesión.',
                };
            } catch {
                return {
                    success: false,
                    message:
                        'No pudimos completar el alta con esos datos. Si el correo puede continuar con una cuenta, te vamos a guiar en el siguiente paso.',
                };
            } finally {
                setAuthLoading(false);
            }
        },
        [refreshState],
    );

    const verifyCustomer = useCallback(
        async ({ token, password }: { token: string; password?: string }): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<VerifyResponse>(VERIFY_CUSTOMER_MUTATION, {
                    token,
                    password: password || null,
                });

                if (isErrorResultLike(data.verifyCustomerAccount) && data.verifyCustomerAccount.errorCode) {
                    return getOperationResultMessage(
                        data.verifyCustomerAccount,
                        'No se pudo verificar la cuenta.',
                    );
                }

                await refreshState();
                broadcastAuthSyncEvent({
                    type: 'session-updated',
                    source: syncSource,
                    at: Date.now(),
                });
                return {
                    success: true,
                    message: 'Cuenta verificada. Ya podés comprar y administrar tu sesión.',
                };
            } catch (error) {
                return getOperationResultMessage(error, 'No se pudo verificar la cuenta.');
            } finally {
                setAuthLoading(false);
            }
        },
        [refreshState],
    );

    const requestPasswordReset = useCallback(
        async (emailAddress: string): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<RequestPasswordResetResponse>(
                    REQUEST_PASSWORD_RESET_MUTATION,
                    { emailAddress },
                );

                if (
                    isErrorResultLike(data.requestPasswordReset) &&
                    data.requestPasswordReset.errorCode
                ) {
                    return getOperationResultMessage(
                        data.requestPasswordReset,
                        'No se pudo iniciar el recupero de contraseña.',
                    );
                }

                return {
                    success: true,
                    message:
                        'Si existe una cuenta con ese correo, te enviamos un enlace para recuperar la contraseña.',
                };
            } catch {
                return {
                    success: false,
                    message: 'No se pudo iniciar el recupero de acceso en este momento.',
                };
            } finally {
                setAuthLoading(false);
            }
        },
        [],
    );

    const recoverCustomerAccess = useCallback(
        async (emailAddress: string): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<RecoverCustomerAccessResponse>(
                    RECOVER_CUSTOMER_ACCESS_MUTATION,
                    { emailAddress },
                );

                if (!data.recoverCustomerAccess.success) {
                    return {
                        success: false,
                        message: 'No se pudo iniciar la recuperación de acceso.',
                    };
                }

                return {
                    success: true,
                    message:
                        'Si existe una cuenta o historial de compras con ese correo, te enviamos instrucciones para recuperar o activar el acceso.',
                };
            } catch {
                return {
                    success: false,
                    message: 'No se pudo iniciar la recuperación de acceso en este momento.',
                };
            } finally {
                setAuthLoading(false);
            }
        },
        [],
    );

    const resetPassword = useCallback(
        async ({ token, password }: { token: string; password: string }): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<ResetPasswordResponse>(RESET_PASSWORD_MUTATION, {
                    token,
                    password,
                });

                if (isErrorResultLike(data.resetPassword) && data.resetPassword.errorCode) {
                    return getOperationResultMessage(
                        data.resetPassword,
                        'No se pudo actualizar la contraseña.',
                    );
                }

                await refreshState();
                broadcastAuthSyncEvent({
                    type: 'session-updated',
                    source: syncSource,
                    at: Date.now(),
                });

                return {
                    success: true,
                    message: 'La contraseña se actualizó correctamente.',
                };
            } catch (error) {
                return getOperationResultMessage(error, 'No se pudo actualizar la contraseña.');
            } finally {
                setAuthLoading(false);
            }
        },
        [refreshState, syncSource],
    );

    const refreshCustomerVerification = useCallback(
        async (emailAddress: string): Promise<OperationResult> => {
            setAuthLoading(true);

            try {
                const data = await fetchShopApi<RefreshCustomerVerificationResponse>(
                    REFRESH_CUSTOMER_VERIFICATION_MUTATION,
                    { emailAddress },
                );

                if (
                    isErrorResultLike(data.refreshCustomerVerification) &&
                    data.refreshCustomerVerification.errorCode
                ) {
                    return getOperationResultMessage(
                        data.refreshCustomerVerification,
                        'No se pudo reenviar el mail de verificación.',
                    );
                }

                return {
                    success: true,
                    message: 'Te reenviamos el mail de verificación.',
                };
            } catch {
                return {
                    success: false,
                    message: 'No se pudo iniciar el envío de verificación en este momento.',
                };
            } finally {
                setAuthLoading(false);
            }
        },
        [],
    );

    const logout = useCallback(async (): Promise<OperationResult> => {
        setAuthLoading(true);

        try {
            const data = await fetchShopApi<LogoutResponse>(LOGOUT_MUTATION);

            if (!data.logout.success) {
                return {
                    success: false,
                    message: 'No se pudo cerrar la sesión.',
                };
            }

            setCustomer(null);
            setActiveOrder(null);
            await refreshState();
            broadcastAuthSyncEvent({
                type: 'logout',
                source: syncSource,
                at: Date.now(),
            });
            return {
                success: true,
                message: 'Sesión cerrada.',
            };
        } catch (error) {
            return getOperationResultMessage(error, 'No se pudo cerrar la sesión.');
        } finally {
            setAuthLoading(false);
        }
    }, [refreshState, syncSource]);

    const runOrderMutation = useCallback(
        async (
            fieldName: 'addItemToOrder' | 'adjustOrderLine' | 'removeOrderLine',
            query: string,
            variables: Record<string, unknown>,
            successMessage: string,
            fallbackMessage: string,
        ): Promise<OperationResult> => {
            setCartLoading(true);

            try {
                const data = await fetchShopApi<Record<string, OrderMutationResult | ActiveOrder | null>>(query, variables);

                const result = data[fieldName];

                if (isActiveOrder(result)) {
                    setActiveOrder(result);
                    return { success: true, message: successMessage, order: result };
                }

                if (isNonNullableOrderResult(result) && result.order && isActiveOrder(result.order)) {
                    setActiveOrder(result.order);
                    return { success: true, message: successMessage, order: result.order };
                }

                if (isErrorResultLike(result) && result.errorCode) {
                    return getOperationResultMessage(result, fallbackMessage);
                }

                await refreshState();
                return { success: true, message: successMessage };
            } catch (error) {
                return getOperationResultMessage(error, fallbackMessage);
            } finally {
                setCartLoading(false);
            }
        },
        [refreshState],
    );

    const addItemToOrder = useCallback(
        (productVariantId: string, quantity: number, customFields?: Record<string, unknown>) =>
            runOrderMutation(
                'addItemToOrder',
                ADD_ITEM_TO_ORDER_MUTATION,
                { productVariantId, quantity, customFields },
                'Producto agregado al carrito.',
                'No se pudo agregar el producto al carrito.',
            ),
        [runOrderMutation],
    );

    const adjustOrderLine = useCallback(
        (orderLineId: string, quantity: number) =>
            runOrderMutation(
                'adjustOrderLine',
                ADJUST_ORDER_LINE_MUTATION,
                { orderLineId, quantity },
                'Carrito actualizado.',
                'No se pudo actualizar el carrito.',
            ),
        [runOrderMutation],
    );

    const removeOrderLine = useCallback(
        (orderLineId: string) =>
            runOrderMutation(
                'removeOrderLine',
                REMOVE_ORDER_LINE_MUTATION,
                { orderLineId },
                'Producto eliminado del carrito.',
                'No se pudo quitar el producto del carrito.',
            ),
        [runOrderMutation],
    );

    const value = useMemo<StorefrontContextValue>(
        () => ({
            activeOrder,
            cartQuantity: activeOrder?.totalQuantity ?? 0,
            cartLoading,
            customer,
            initialized,
            authLoading,
            isAuthenticated: Boolean(customer),
            refreshState,
            login,
            register,
            recoverCustomerAccess,
            refreshCustomerVerification,
            requestPasswordReset,
            verifyCustomer,
            resetPassword,
            logout,
            addItemToOrder,
            adjustOrderLine,
            removeOrderLine,
        }),
        [
            activeOrder,
            cartLoading,
            customer,
            initialized,
            authLoading,
            refreshState,
            login,
            register,
            recoverCustomerAccess,
            refreshCustomerVerification,
            requestPasswordReset,
            verifyCustomer,
            resetPassword,
            logout,
            addItemToOrder,
            adjustOrderLine,
            removeOrderLine,
        ],
    );

    return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
    const context = useContext(StorefrontContext);

    if (!context) {
        throw new Error('useStorefront debe usarse dentro de StorefrontProvider.');
    }

    return context;
}
