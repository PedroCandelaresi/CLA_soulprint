import { NextRequest, NextResponse } from 'next/server';
import {
    appendVendureCookies,
    authenticateWithGoogleIdToken,
    clearGoogleStateCookie,
    exchangeGoogleCode,
    parseGoogleState,
} from '../../utils';

export const dynamic = 'force-dynamic';

function redirectToLogin(request: NextRequest, error: string): NextResponse {
    const isSecure = request.nextUrl.protocol === 'https:';
    const response = NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error)}`, request.url),
    );
    clearGoogleStateCookie(response, isSecure);
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
        const idToken = await exchangeGoogleCode(request, code);
        const authResult = await authenticateWithGoogleIdToken({
            idToken,
            cookieHeader: request.headers.get('cookie') || undefined,
            forwardedProto: request.nextUrl.protocol.replace(':', '') || request.headers.get('x-forwarded-proto') || undefined,
            forwardedHost: request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host,
            forwardedFor: request.headers.get('x-forwarded-for') || undefined,
            origin: request.nextUrl.origin,
            referer: request.headers.get('referer') || request.nextUrl.origin,
        });

        if (!authResult.body.success) {
            return redirectToLogin(request, authResult.body.error || 'No se pudo iniciar sesión con Google.');
        }

        const response = NextResponse.redirect(new URL(parsedState.returnTo, request.url));
        clearGoogleStateCookie(response, request.nextUrl.protocol === 'https:');
        return appendVendureCookies(authResult.headers, response);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo completar el ingreso con Google.';
        return redirectToLogin(request, message);
    }
}
