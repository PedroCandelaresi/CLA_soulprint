import { createHmac, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders, fetchVendureApi } from '@/lib/vendure/client';
import type {
    AuthActionResponse,
    CustomerDashboardData,
    CustomerOrderSummary,
    CustomerSummary,
} from '@/types/customer-account';
import type { PersonalizationOrderResponseData } from '@/types/personalization';
import { buildAndreaniBackendUrl } from '../logistics/andreani/utils';
import {
    buildPersonalizationBackendUrl,
    normalizePersonalizationPayload,
} from '../logistics/personalization/utils';

const LOGIN_MUTATION = `
    mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
        login(username: $username, password: $password, rememberMe: $rememberMe) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on InvalidCredentialsError {
                errorCode
                message
                authenticationError
            }
            ... on NotVerifiedError {
                errorCode
                message
            }
            ... on NativeAuthStrategyError {
                errorCode
                message
            }
        }
    }
`;

const REGISTER_MUTATION = `
    mutation RegisterCustomerAccount($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
            __typename
            ... on Success {
                success
            }
            ... on MissingPasswordError {
                errorCode
                message
            }
            ... on PasswordValidationError {
                errorCode
                message
                validationErrorMessage
            }
            ... on NativeAuthStrategyError {
                errorCode
                message
            }
        }
    }
`;

const LOGOUT_MUTATION = `
    mutation Logout {
        logout {
            success
        }
    }
`;

const AUTHENTICATE_GOOGLE_MUTATION = `
    mutation AuthenticateWithGoogle($token: String!) {
        authenticate(input: { google: { token: $token } }) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on InvalidCredentialsError {
                errorCode
                message
                authenticationError
            }
            ... on NotVerifiedError {
                errorCode
                message
            }
        }
    }
`;

const ACTIVE_CUSTOMER_QUERY = `
    query ActiveCustomerSummary {
        activeCustomer {
            id
            firstName
            lastName
            emailAddress
            phoneNumber
        }
    }
`;

const ACTIVE_CUSTOMER_DASHBOARD_QUERY = `
    query ActiveCustomerDashboard {
        activeCustomer {
            id
            firstName
            lastName
            emailAddress
            phoneNumber
            orders(options: { take: 50 }) {
                totalItems
                items {
                    id
                    code
                    state
                    active
                    createdAt
                    updatedAt
                    orderPlacedAt
                    totalWithTax
                    currencyCode
                    totalQuantity
                    payments {
                        state
                        method
                        transactionId
                    }
                    fulfillments {
                        state
                        method
                        trackingCode
                    }
                    shippingAddress {
                        fullName
                        company
                        streetLine1
                        streetLine2
                        city
                        province
                        postalCode
                        country
                        phoneNumber
                    }
                    billingAddress {
                        fullName
                        company
                        streetLine1
                        streetLine2
                        city
                        province
                        postalCode
                        country
                        phoneNumber
                    }
                    shippingLines {
                        priceWithTax
                        shippingMethod {
                            name
                        }
                    }
                    lines {
                        id
                        quantity
                        featuredAsset {
                            preview
                        }
                        discountedLinePriceWithTax
                        productVariant {
                            name
                            customFields {
                                requiresPersonalization
                            }
                            product {
                                name
                                slug
                            }
                        }
                    }
                }
            }
        }
    }
`;

const GOOGLE_STATE_COOKIE_NAME = 'cla_google_oauth_state';
const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

interface CurrentUserResult {
    __typename: 'CurrentUser';
    id: string;
    identifier: string;
}

interface ErrorResult {
    __typename: string;
    message?: string;
    authenticationError?: string;
    validationErrorMessage?: string;
}

interface LoginData {
    login: CurrentUserResult | ErrorResult;
}

interface RegisterData {
    registerCustomerAccount: { __typename: 'Success'; success: boolean } | ErrorResult;
}

interface LogoutData {
    logout: {
        success: boolean;
    };
}

interface AuthenticateGoogleData {
    authenticate: CurrentUserResult | ErrorResult;
}

interface VendureOrderAddress {
    fullName: string | null;
    company: string | null;
    streetLine1: string | null;
    streetLine2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    phoneNumber: string | null;
}

interface VendureCustomer {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string | null;
    orders?: {
        totalItems: number;
        items: VendureOrder[];
    };
}

interface VendureOrder {
    id: string;
    code: string;
    state: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    orderPlacedAt: string | null;
    totalWithTax: number;
    currencyCode: string;
    totalQuantity: number;
    payments?: Array<{
        state: string | null;
        method: string | null;
        transactionId: string | null;
    }> | null;
    fulfillments?: Array<{
        state: string | null;
        method: string | null;
        trackingCode: string | null;
    }> | null;
    shippingAddress?: VendureOrderAddress | null;
    billingAddress?: VendureOrderAddress | null;
    shippingLines?: Array<{
        priceWithTax: number;
        shippingMethod?: {
            name: string;
        } | null;
    }> | null;
    lines: Array<{
        id: string;
        quantity: number;
        discountedLinePriceWithTax: number;
        featuredAsset?: {
            preview: string;
        } | null;
        productVariant?: {
            name: string;
            customFields?: {
                requiresPersonalization?: boolean | null;
            } | null;
            product?: {
                name: string;
                slug: string;
            } | null;
        } | null;
    }>;
}

interface ActiveCustomerData {
    activeCustomer: VendureCustomer | null;
}

interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
    id_token?: string;
}

interface GoogleStatePayload {
    state: string;
    returnTo: string;
    expiresAt: number;
}

function getAuthSecret(): string {
    return process.env.COOKIE_SECRET
        || process.env.GOOGLE_CLIENT_SECRET
        || 'local-google-auth-secret-change-me';
}

function toBase64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string): string {
    return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

function buildSignedStateCookie(payload: GoogleStatePayload): string {
    const serializedPayload = toBase64Url(JSON.stringify(payload));
    const signature = signValue(serializedPayload);
    return `${serializedPayload}.${signature}`;
}

function parseSignedStateCookie(value: string | undefined): GoogleStatePayload | null {
    if (!value) {
        return null;
    }

    const [payload, signature] = value.split('.');
    if (!payload || !signature || signValue(payload) !== signature) {
        return null;
    }

    try {
        const parsed = JSON.parse(fromBase64Url(payload)) as GoogleStatePayload;
        if (!parsed.state || !parsed.returnTo || parsed.expiresAt < Date.now()) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'No se pudo completar la solicitud.';
}

function isAuthError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes('forbidden')
        || message.includes('no active session')
        || message.includes('not authorized')
        || message.includes('error.forbidden');
}

function sanitizeReturnTo(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/auth/account';
    }
    return value;
}

function buildVendureHeaders(cookieHeader?: string): HeadersInit | undefined {
    if (!cookieHeader) {
        return undefined;
    }

    return { cookie: cookieHeader };
}

function extractUnionError(result: ErrorResult): string {
    return result.validationErrorMessage || result.authenticationError || result.message || 'La operación no pudo completarse.';
}

function mapCustomer(customer: VendureCustomer): CustomerSummary {
    return {
        id: customer.id,
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        emailAddress: customer.emailAddress,
        phoneNumber: customer.phoneNumber || null,
    };
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function readBoolean(value: unknown): boolean {
    return value === true;
}

async function fetchPersonalization(
    orderCode: string,
    cookieHeader?: string,
): Promise<PersonalizationOrderResponseData | null> {
    const response = await fetch(
        buildPersonalizationBackendUrl(`order/${encodeURIComponent(orderCode)}`),
        {
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            cache: 'no-store',
        },
    );

    let payload: Record<string, unknown> | null = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    const normalized = normalizePersonalizationPayload(payload);
    const success = normalized && normalized.success === true;
    const data = normalized?.data;
    if (!response.ok || !success || !data || typeof data !== 'object') {
        return null;
    }

    return data as PersonalizationOrderResponseData;
}

async function fetchAndreaniLogistics(
    orderCode: string,
    cookieHeader?: string,
): Promise<Record<string, unknown> | null> {
    const response = await fetch(
        buildAndreaniBackendUrl(`order/${encodeURIComponent(orderCode)}`),
        {
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            cache: 'no-store',
        },
    );

    let payload: Record<string, unknown> | null = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || !payload || payload.success !== true || !payload.data || typeof payload.data !== 'object') {
        return null;
    }

    return payload.data as Record<string, unknown>;
}

function mapOrder(
    order: VendureOrder,
    personalization: PersonalizationOrderResponseData | null,
    logistics: Record<string, unknown> | null,
): CustomerOrderSummary {
    const lastPayment = order.payments?.[order.payments.length - 1] ?? null;
    const lastFulfillment = order.fulfillments?.[order.fulfillments.length - 1] ?? null;
    const shipmentState =
        personalization?.shipmentState
        || readString(logistics?.andreaniShipmentStatus)
        || lastFulfillment?.state
        || null;
    const trackingCode =
        personalization?.trackingNumber
        || readString(logistics?.andreaniTrackingNumber)
        || lastFulfillment?.trackingCode
        || null;

    return {
        id: order.id,
        code: order.code,
        state: order.state,
        active: order.active,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        orderPlacedAt: order.orderPlacedAt,
        totalWithTax: order.totalWithTax,
        currencyCode: order.currencyCode,
        totalQuantity: order.totalQuantity,
        payment: {
            state: lastPayment?.state || null,
            method: lastPayment?.method || null,
            transactionId: lastPayment?.transactionId || null,
        },
        fulfillment: {
            state: lastFulfillment?.state || null,
            method: lastFulfillment?.method || null,
            trackingCode: lastFulfillment?.trackingCode || null,
        },
        shipmentState,
        trackingCode,
        shippingAddress: order.shippingAddress || null,
        billingAddress: order.billingAddress || null,
        shippingLines: (order.shippingLines || []).map((line) => ({
            name: line.shippingMethod?.name || 'Envío',
            priceWithTax: line.priceWithTax,
        })),
        items: (order.lines || []).map((line) => ({
            id: line.id,
            quantity: line.quantity,
            productName: line.productVariant?.product?.name || 'Producto',
            productSlug: line.productVariant?.product?.slug || null,
            variantName: line.productVariant?.name || 'Variante',
            previewUrl: line.featuredAsset?.preview || null,
            linePriceWithTax: line.discountedLinePriceWithTax,
            requiresPersonalization: Boolean(line.productVariant?.customFields?.requiresPersonalization),
        })),
        personalization: personalization
            ? {
                requiresPersonalization: personalization.requiresPersonalization,
                personalizationStatus: personalization.personalizationStatus,
                assetId: personalization.assetId,
                assetUrl: personalization.assetUrl,
                assetPreviewUrl: personalization.assetPreviewUrl,
                originalFilename: personalization.originalFilename,
                uploadedAt: personalization.uploadedAt,
                notes: personalization.notes,
                accessToken: personalization.accessToken,
            }
            : null,
        logistics: logistics
            ? {
                carrier: readString(logistics.andreaniCarrier),
                serviceName: readString(logistics.andreaniServiceName),
                shipmentStatus: readString(logistics.andreaniShipmentStatus),
                trackingNumber: readString(logistics.andreaniTrackingNumber),
                shipmentCreated: readBoolean(logistics.andreaniShipmentCreated),
            }
            : null,
    };
}

function sortOrdersDesc(orders: CustomerOrderSummary[]): CustomerOrderSummary[] {
    return [...orders].sort((left, right) => {
        const leftDate = new Date(left.orderPlacedAt || left.createdAt).getTime();
        const rightDate = new Date(right.orderPlacedAt || right.createdAt).getTime();
        return rightDate - leftDate;
    });
}

export async function fetchActiveCustomer(cookieHeader?: string): Promise<CustomerSummary | null> {
    const { data } = await fetchVendureApi<ActiveCustomerData>(ACTIVE_CUSTOMER_QUERY, {
        headers: buildVendureHeaders(cookieHeader),
    });

    return data.activeCustomer ? mapCustomer(data.activeCustomer) : null;
}

export async function loadCustomerDashboard(cookieHeader?: string): Promise<CustomerDashboardData | null> {
    const { data } = await fetchVendureApi<ActiveCustomerData>(ACTIVE_CUSTOMER_DASHBOARD_QUERY, {
        headers: buildVendureHeaders(cookieHeader),
    });

    const customer = data.activeCustomer;
    if (!customer) {
        return null;
    }

    const orders = await Promise.all(
        (customer.orders?.items || []).map(async (order) => {
            const [personalization, logistics] = await Promise.all([
                fetchPersonalization(order.code, cookieHeader).catch(() => null),
                fetchAndreaniLogistics(order.code, cookieHeader).catch(() => null),
            ]);

            return mapOrder(order, personalization, logistics);
        }),
    );

    return {
        customer: mapCustomer(customer),
        orders: sortOrdersDesc(orders),
    };
}

export async function performLogin(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
    cookieHeader?: string;
}): Promise<{ body: AuthActionResponse; headers: Headers }> {
    const result = await fetchVendureApi<LoginData>(LOGIN_MUTATION, {
        headers: buildVendureHeaders(input.cookieHeader),
        variables: {
            username: input.email,
            password: input.password,
            rememberMe: input.rememberMe ?? true,
        },
    });

    if (result.data.login.__typename !== 'CurrentUser') {
        return {
            body: {
                success: false,
                error: extractUnionError(result.data.login),
            },
            headers: result.headers,
        };
    }

    return {
        body: { success: true },
        headers: result.headers,
    };
}

export async function performRegister(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    cookieHeader?: string;
}): Promise<{ body: AuthActionResponse; headers: Headers }> {
    const registerResult = await fetchVendureApi<RegisterData>(REGISTER_MUTATION, {
        headers: buildVendureHeaders(input.cookieHeader),
        variables: {
            input: {
                emailAddress: input.email,
                firstName: input.firstName || undefined,
                lastName: input.lastName || undefined,
                password: input.password,
            },
        },
    });

    if (registerResult.data.registerCustomerAccount.__typename !== 'Success') {
        return {
            body: {
                success: false,
                error: extractUnionError(registerResult.data.registerCustomerAccount),
            },
            headers: registerResult.headers,
        };
    }

    const loginResult = await performLogin({
        email: input.email,
        password: input.password,
        rememberMe: true,
        cookieHeader: input.cookieHeader,
    });

    if (!loginResult.body.success) {
        return {
            body: {
                success: true,
                verificationRequired: true,
                message: 'Si la cuenta ya quedó lista, iniciá sesión. Si usa verificación, revisá tu email antes de entrar.',
            },
            headers: loginResult.headers,
        };
    }

    return loginResult;
}

export async function performLogout(cookieHeader?: string): Promise<{ body: AuthActionResponse; headers: Headers }> {
    const result = await fetchVendureApi<LogoutData>(LOGOUT_MUTATION, {
        headers: buildVendureHeaders(cookieHeader),
    });

    return {
        body: { success: Boolean(result.data.logout.success) },
        headers: result.headers,
    };
}

export async function authenticateWithGoogleIdToken(input: {
    idToken: string;
    cookieHeader?: string;
}): Promise<{ body: AuthActionResponse; headers: Headers }> {
    const result = await fetchVendureApi<AuthenticateGoogleData>(AUTHENTICATE_GOOGLE_MUTATION, {
        headers: buildVendureHeaders(input.cookieHeader),
        variables: {
            token: input.idToken,
        },
    });

    if (result.data.authenticate.__typename !== 'CurrentUser') {
        return {
            body: {
                success: false,
                error: extractUnionError(result.data.authenticate),
            },
            headers: result.headers,
        };
    }

    return {
        body: { success: true },
        headers: result.headers,
    };
}

export function appendVendureCookies(sourceHeaders: Headers, response: NextResponse): NextResponse {
    appendVendureSetCookieHeaders(sourceHeaders, response.headers);
    return response;
}

export function buildGoogleAuthRedirect(request: NextRequest): NextResponse {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
        return NextResponse.redirect(new URL('/auth/login?error=Google%20OAuth%20no%20est%C3%A1%20configurado.', request.url));
    }

    const redirectUri = process.env.GOOGLE_CALLBACK_URL?.trim()
        || new URL('/api/auth/google/callback', request.url).toString();
    const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('next'));
    const state = randomBytes(24).toString('hex');
    const stateCookie = buildSignedStateCookie({
        state,
        returnTo,
        expiresAt: Date.now() + GOOGLE_STATE_TTL_MS,
    });

    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', clientId);
    googleUrl.searchParams.set('redirect_uri', redirectUri);
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('state', state);
    googleUrl.searchParams.set('prompt', 'select_account');
    googleUrl.searchParams.set('access_type', 'online');

    const response = NextResponse.redirect(googleUrl);
    response.cookies.set({
        name: GOOGLE_STATE_COOKIE_NAME,
        value: stateCookie,
        httpOnly: true,
        secure: request.nextUrl.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(GOOGLE_STATE_TTL_MS / 1000),
    });
    return response;
}

export function clearGoogleStateCookie(response: NextResponse, secure: boolean): void {
    response.cookies.set({
        name: GOOGLE_STATE_COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}

export function parseGoogleState(request: NextRequest, returnedState: string | null): {
    success: true;
    returnTo: string;
} | {
    success: false;
    error: string;
} {
    const cookieValue = request.cookies.get(GOOGLE_STATE_COOKIE_NAME)?.value;
    const payload = parseSignedStateCookie(cookieValue);
    if (!payload || !returnedState || payload.state !== returnedState) {
        return {
            success: false,
            error: 'La validación de Google expiró o no es válida.',
        };
    }

    return {
        success: true,
        returnTo: sanitizeReturnTo(payload.returnTo),
    };
}

export async function exchangeGoogleCode(request: NextRequest, code: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_CALLBACK_URL?.trim()
        || new URL('/api/auth/google/callback', request.url).toString();

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth no está configurado.');
    }

    const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        cache: 'no-store',
    });

    const payload = await response.json() as GoogleTokenResponse;
    if (!response.ok || !payload.id_token) {
        throw new Error(payload.error_description || payload.error || 'Google no devolvió un token válido.');
    }

    return payload.id_token;
}

export function toUnauthorizedResponse(error?: string): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: error || 'Necesitás iniciar sesión para acceder a esta sección.',
        },
        { status: 401 },
    );
}

export function toJsonResponse(body: AuthActionResponse, status = 200): NextResponse {
    return NextResponse.json(body, { status });
}

export function resolveAuthErrorResponse(error: unknown, fallback: string, unauthorizedStatus = 401): NextResponse {
    if (isAuthError(error)) {
        return toUnauthorizedResponse();
    }

    return NextResponse.json(
        {
            success: false,
            error: getErrorMessage(error) || fallback,
        },
        { status: unauthorizedStatus },
    );
}
