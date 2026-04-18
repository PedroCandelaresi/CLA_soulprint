const DEFAULT_AUTH_REDIRECT = '/mi-cuenta';

export type LoginRedirectOptions = {
    authError?: 'session-unavailable';
};

export function resolveRedirectTarget(
    rawValue?: string | null,
    fallback: string = DEFAULT_AUTH_REDIRECT,
): string {
    if (!rawValue) {
        return fallback;
    }

    if (!rawValue.startsWith('/') || rawValue.startsWith('//')) {
        return fallback;
    }

    if (rawValue.startsWith('/auth/')) {
        return fallback;
    }

    return rawValue;
}

export function buildLoginRedirectHref(
    redirectTarget?: string | null,
    options?: LoginRedirectOptions,
): string {
    const target = resolveRedirectTarget(redirectTarget, DEFAULT_AUTH_REDIRECT);
    const searchParams = new URLSearchParams();

    searchParams.set('redirect', target);

    if (options?.authError) {
        searchParams.set('authError', options.authError);
    }

    return `/auth/login?${searchParams.toString()}`;
}
