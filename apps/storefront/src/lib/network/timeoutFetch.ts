const DEFAULT_TIMEOUT_MS = 20000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 60000;

function readTimeoutEnv(): string | undefined {
    return process.env.STOREFRONT_UPSTREAM_TIMEOUT_MS || process.env.NEXT_PUBLIC_STOREFRONT_UPSTREAM_TIMEOUT_MS;
}

export function getStorefrontFetchTimeoutMs(): number {
    const parsed = Number(readTimeoutEnv());
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TIMEOUT_MS;
    }
    return Math.min(Math.max(parsed, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return 'unknown error';
}

export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = getStorefrontFetchTimeoutMs(),
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: init.signal || controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted && error instanceof Error) {
            throw new Error(`upstream timeout after ${timeoutMs}ms`, { cause: error });
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
