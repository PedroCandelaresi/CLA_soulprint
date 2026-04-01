import { NextRequest, NextResponse } from 'next/server';
import {
    appendVendureCookies,
    authenticateWithGoogleIdToken,
    buildAuthProxyContext,
    clearGoogleStateCookie,
    exchangeGoogleCode,
    isSecureRequest,
    parseGoogleState,
} from '../../utils';

export const dynamic = 'force-dynamic';

function redirectToLogin(request: NextRequest, error: string): NextResponse {
    const response = NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error)}`, request.url),
    );
    clearGoogleStateCookie(response, isSecureRequest(request));
    return response;
}

export async function GET(request: NextRequest) {
    const oauthError = request.nextUrl.searchParams.get('error');
    if (oauthError) {
        return redirectToLogin(request, oauthError);
    }

    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    if (!code || !state) {
        return redirectToLogin(request, 'Google no devolvió los parámetros esperados.');
    }

    const parsedState = parseGoogleState(request, state);
    if (!parsedState.success) {
        return redirectToLogin(request, parsedState.error);
    }

    try {
        const authProxyContext = buildAuthProxyContext(request);
        const idToken = await exchangeGoogleCode(request, code);
        const authResult = await authenticateWithGoogleIdToken({
            idToken,
            ...authProxyContext,
        });

        if (!authResult.body.success) {
            return redirectToLogin(request, authResult.body.error || 'No se pudo iniciar sesión con Google.');
        }

        const origin = authProxyContext.origin || request.nextUrl.origin;
        const response = NextResponse.redirect(`${origin}${parsedState.returnTo}`);
        clearGoogleStateCookie(response, isSecureRequest(request));
        return appendVendureCookies(authResult.headers, response);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo completar el ingreso con Google.';
        return redirectToLogin(request, message);
    }
}
