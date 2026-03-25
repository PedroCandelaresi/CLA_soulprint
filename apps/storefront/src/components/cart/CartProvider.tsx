'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';
import type { Cart } from '@/types/cart';

interface CartApiResponse {
    cart: Cart | null;
    error?: string;
}

interface CartContextValue {
    cart: Cart | null;
    totalQuantity: number;
    isInitializing: boolean;
    isMutating: boolean;
    error: string | null;
    refreshCart: () => Promise<void>;
    addItem: (productVariantId: string, quantity?: number) => Promise<void>;
    updateLineQuantity: (lineId: string, quantity: number) => Promise<void>;
    removeLine: (lineId: string) => Promise<void>;
    clearError: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo actualizar el carrito.';
}

async function requestCart(endpoint: string, init?: RequestInit): Promise<Cart | null> {
    const response = await fetch(endpoint, {
        ...init,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });

    const payload = await response.json() as CartApiResponse;
    if (!response.ok || payload.error) {
        throw new Error(payload.error || 'No se pudo actualizar el carrito.');
    }

    return payload.cart;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    const loadCart = useEffectEvent(async () => {
        try {
            const nextCart = await requestCart('/api/cart');
            setCart(nextCart);
            setError(null);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
        } finally {
            setIsInitializing(false);
        }
    });

    useEffect(() => {
        void loadCart();
    }, []);

    async function runMutation(execute: () => Promise<Cart | null>): Promise<void> {
        setIsMutating(true);
        try {
            const nextCart = await execute();
            setCart(nextCart);
            setError(null);
        } catch (mutationError) {
            const message = getErrorMessage(mutationError);
            setError(message);
            throw new Error(message);
        } finally {
            setIsMutating(false);
        }
    }

    async function refreshCart(): Promise<void> {
        setIsInitializing(true);
        try {
            const nextCart = await requestCart('/api/cart');
            setCart(nextCart);
            setError(null);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
        } finally {
            setIsInitializing(false);
        }
    }

    async function addItem(productVariantId: string, quantity = 1): Promise<void> {
        await runMutation(() => requestCart('/api/cart', {
            method: 'POST',
            body: JSON.stringify({ productVariantId, quantity }),
        }));
    }

    async function updateLineQuantity(lineId: string, quantity: number): Promise<void> {
        await runMutation(() => requestCart(`/api/cart/lines/${lineId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
        }));
    }

    async function removeLine(lineId: string): Promise<void> {
        await runMutation(() => requestCart(`/api/cart/lines/${lineId}`, {
            method: 'DELETE',
        }));
    }

    return (
        <CartContext.Provider
            value={{
                cart,
                totalQuantity: cart?.totalQuantity || 0,
                isInitializing,
                isMutating,
                error,
                refreshCart,
                addItem,
                updateLineQuantity,
                removeLine,
                clearError: () => setError(null),
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }

    return context;
}
