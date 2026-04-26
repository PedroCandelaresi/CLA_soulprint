import type {
    ActiveOrder,
    EligiblePaymentMethod,
    EligibleShippingMethod,
    OperationResult,
    StorefrontCustomer,
} from '@/types/storefront';

interface GraphQLError {
    message: string;
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: GraphQLError[];
}

interface ErrorResultLike {
    __typename?: string;
    errorCode?: string | null;
    message?: string | null;
    paymentErrorMessage?: string | null;
    eligibilityCheckerMessage?: string | null;
    transitionError?: string | null;
    errorDetail?: string | null;
}

const SHOP_PROXY_ENDPOINT = '/api/shop';

const ACTIVE_ORDER_FRAGMENT = /* GraphQL */ `
    fragment ActiveOrderFields on Order {
        __typename
        id
        code
        state
        currencyCode
        totalQuantity
        subTotalWithTax
        shipping
        shippingWithTax
        totalWithTax
        shippingAddress {
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            country
            countryCode
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
            countryCode
            phoneNumber
        }
        shippingLines {
            id
            priceWithTax
            shippingMethod {
                id
                code
                name
                description
            }
        }
        payments {
            id
            createdAt
            updatedAt
            method
            amount
            state
            transactionId
            errorMessage
            metadata
        }
        lines {
            id
            quantity
            unitPriceWithTax
            linePriceWithTax
            featuredAsset {
                id
                preview
            }
            productVariant {
                id
                name
                sku
            }
            customFields {
                frontMode
                frontText
                backMode
                backText
            }
        }
    }
`;

export const GET_STOREFRONT_STATE_QUERY = /* GraphQL */ `
    query GetStorefrontState {
        activeCustomer {
            id
            title
            firstName
            lastName
            phoneNumber
            emailAddress
        }
        activeOrder {
            ...ActiveOrderFields
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const GET_ORDER_BY_CODE_QUERY = /* GraphQL */ `
    query GetOrderByCode($code: String!) {
        orderByCode(code: $code) {
            ...ActiveOrderFields
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const LOGIN_MUTATION = /* GraphQL */ `
    mutation LogIn($emailAddress: String!, $password: String!, $rememberMe: Boolean!) {
        login(username: $emailAddress, password: $password, rememberMe: $rememberMe) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const REGISTER_CUSTOMER_MUTATION = /* GraphQL */ `
    mutation RegisterCustomer($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const REFRESH_CUSTOMER_VERIFICATION_MUTATION = /* GraphQL */ `
    mutation RefreshCustomerVerification($emailAddress: String!) {
        refreshCustomerVerification(emailAddress: $emailAddress) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = /* GraphQL */ `
    mutation RequestPasswordReset($emailAddress: String!) {
        requestPasswordReset(emailAddress: $emailAddress) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RECOVER_CUSTOMER_ACCESS_MUTATION = /* GraphQL */ `
    mutation RecoverCustomerAccess($emailAddress: String!) {
        recoverCustomerAccess(emailAddress: $emailAddress) {
            success
        }
    }
`;

export const VERIFY_CUSTOMER_MUTATION = /* GraphQL */ `
    mutation VerifyCustomer($token: String!, $password: String) {
        verifyCustomerAccount(token: $token, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RESET_PASSWORD_MUTATION = /* GraphQL */ `
    mutation ResetPassword($token: String!, $password: String!) {
        resetPassword(token: $token, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const LOGOUT_MUTATION = /* GraphQL */ `
    mutation LogOut {
        logout {
            success
        }
    }
`;

export const ADD_ITEM_TO_ORDER_MUTATION = /* GraphQL */ `
    mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!, $customFields: OrderLineCustomFieldsInput) {
        addItemToOrder(productVariantId: $productVariantId, quantity: $quantity, customFields: $customFields) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
            ... on InsufficientStockError {
                errorCode
                message
                quantityAvailable
                order {
                    ...ActiveOrderFields
                }
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const ADJUST_ORDER_LINE_MUTATION = /* GraphQL */ `
    mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
        adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const REMOVE_ORDER_LINE_MUTATION = /* GraphQL */ `
    mutation RemoveOrderLine($orderLineId: ID!) {
        removeOrderLine(orderLineId: $orderLineId) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const SET_CUSTOMER_FOR_ORDER_MUTATION = /* GraphQL */ `
    mutation SetCustomerForOrder($input: CreateCustomerInput!) {
        setCustomerForOrder(input: $input) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const SET_ORDER_SHIPPING_ADDRESS_MUTATION = /* GraphQL */ `
    mutation SetOrderShippingAddress($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const SET_ORDER_BILLING_ADDRESS_MUTATION = /* GraphQL */ `
    mutation SetOrderBillingAddress($input: CreateAddressInput!) {
        setOrderBillingAddress(input: $input) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const GET_ELIGIBLE_SHIPPING_METHODS_QUERY = /* GraphQL */ `
    query GetEligibleShippingMethods {
        eligibleShippingMethods {
            id
            code
            name
            description
            price
            priceWithTax
        }
    }
`;

export const SET_ORDER_SHIPPING_METHOD_MUTATION = /* GraphQL */ `
    mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
        setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const GET_ELIGIBLE_PAYMENT_METHODS_QUERY = /* GraphQL */ `
    query GetEligiblePaymentMethods {
        eligiblePaymentMethods {
            id
            code
            name
            description
            isEligible
            eligibilityMessage
            icon
        }
    }
`;

export const TRANSITION_ORDER_TO_STATE_MUTATION = /* GraphQL */ `
    mutation TransitionOrderToState($state: String!) {
        transitionOrderToState(state: $state) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
            ... on OrderStateTransitionError {
                transitionError
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const ADD_PAYMENT_TO_ORDER_MUTATION = /* GraphQL */ `
    mutation AddPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
            ...ActiveOrderFields
            ... on ErrorResult {
                errorCode
                message
            }
            ... on IneligiblePaymentMethodError {
                eligibilityCheckerMessage
            }
            ... on PaymentDeclinedError {
                paymentErrorMessage
            }
            ... on PaymentFailedError {
                paymentErrorMessage
            }
            ... on OrderStateTransitionError {
                transitionError
            }
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export const RETRY_MERCADOPAGO_PAYMENT_MUTATION = /* GraphQL */ `
    mutation RetryMercadoPagoPayment($orderCode: String!, $force: Boolean!) {
        retryMercadoPagoPayment(orderCode: $orderCode, force: $force) {
            ...ActiveOrderFields
        }
    }
    ${ACTIVE_ORDER_FRAGMENT}
`;

export interface StorefrontStateResponse {
    activeCustomer: StorefrontCustomer | null;
    activeOrder: ActiveOrder | null;
}

export interface LoginResponse {
    login: ErrorResultLike & {
        id?: string;
        identifier?: string;
    };
}

export interface RegisterResponse {
    registerCustomerAccount: ErrorResultLike & {
        success?: boolean;
    };
}

export interface RefreshCustomerVerificationResponse {
    refreshCustomerVerification: ErrorResultLike & {
        success?: boolean;
    };
}

export interface RequestPasswordResetResponse {
    requestPasswordReset: ErrorResultLike & {
        success?: boolean;
    };
}

export interface RecoverCustomerAccessResponse {
    recoverCustomerAccess: {
        success: boolean;
    };
}

export interface VerifyResponse {
    verifyCustomerAccount: ErrorResultLike & {
        id?: string;
        identifier?: string;
    };
}

export interface ResetPasswordResponse {
    resetPassword: ErrorResultLike & {
        id?: string;
        identifier?: string;
    };
}

export interface LogoutResponse {
    logout: {
        success: boolean;
    };
}

export interface EligibleShippingMethodsResponse {
    eligibleShippingMethods: EligibleShippingMethod[];
}

export interface EligiblePaymentMethodsResponse {
    eligiblePaymentMethods: EligiblePaymentMethod[];
}

export interface OrderByCodeResponse {
    orderByCode: ActiveOrder | null;
}

export interface RetryMercadoPagoPaymentResponse {
    retryMercadoPagoPayment: ActiveOrder;
}

export interface OrderMutationResult extends ErrorResultLike {
    order?: ActiveOrder | null;
}

export async function fetchShopApi<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(SHOP_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        credentials: 'include',
        cache: 'no-store',
    });

    const payload: GraphQLResponse<T> = await response.json();

    if (!response.ok) {
        throw new Error(payload.errors?.[0]?.message || 'No se pudo conectar con la tienda.');
    }

    if (payload.errors?.length) {
        throw new Error(payload.errors[0].message);
    }

    if (!payload.data) {
        throw new Error('La respuesta de la tienda no devolvió datos.');
    }

    return payload.data;
}

export function isErrorResultLike(value: unknown): value is ErrorResultLike {
    return typeof value === 'object' && value !== null && 'errorCode' in value;
}

export function isActiveOrder(value: unknown): value is ActiveOrder {
    return typeof value === 'object' && value !== null && (value as { __typename?: string }).__typename === 'Order';
}

export function getOperationResultMessage(error: unknown, fallbackMessage: string): OperationResult {
    if (isErrorResultLike(error)) {
        return {
            success: false,
            message: error.message || fallbackMessage,
            errorCode: error.errorCode || undefined,
        };
    }

    if (error instanceof Error) {
        return {
            success: false,
            message: error.message || fallbackMessage,
        };
    }

    return {
        success: false,
        message: fallbackMessage,
    };
}

export function getMutationResultMessage(result: unknown, fallbackMessage: string): OperationResult {
    if (typeof result === 'object' && result !== null) {
        const error = result as ErrorResultLike;
        const message =
            error.paymentErrorMessage ||
            error.eligibilityCheckerMessage ||
            error.transitionError ||
            error.errorDetail ||
            error.message;

        if (error.errorCode || message) {
            return {
                success: false,
                message: message || fallbackMessage,
                errorCode: error.errorCode || undefined,
            };
        }
    }

    return getOperationResultMessage(result, fallbackMessage);
}
