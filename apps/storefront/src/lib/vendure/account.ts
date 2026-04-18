import type {
    AccountCustomer,
    AccountShippingLine,
    CustomerAccountData,
    CustomerAddress,
    CustomerAddressInput,
    CustomerEmailChangeInput,
    CustomerOrderDetail,
    CustomerOrderDiscount,
    CustomerOrderFulfillment,
    CustomerOrderLine,
    CustomerOrderPayment,
    CustomerOrderSummary,
    CustomerOrderTaxSummary,
    OperationResult,
    StorefrontCountry,
    UpdateCustomerPasswordInput,
    UpdateCustomerProfileInput,
} from '@/types/storefront';
import { fetchShopApi, getOperationResultMessage } from './shop';

type AccountMutationResult = {
    __typename?: string;
    success?: boolean;
    errorCode?: string | null;
    message?: string | null;
    validationErrorMessage?: string | null;
    authenticationError?: string | null;
};

type RawCustomerOrderSummary = Omit<
    CustomerOrderSummary,
    'lines' | 'shippingLines' | 'payments' | 'fulfillments'
> & {
    lines?: (CustomerOrderLine | null)[] | null;
    shippingLines?: (AccountShippingLine | null)[] | null;
    payments?: (CustomerOrderPayment | null)[] | null;
    fulfillments?: (RawCustomerOrderFulfillment | null)[] | null;
};

type RawCustomerOrderFulfillment = Omit<CustomerOrderFulfillment, 'lines'> & {
    lines?: (CustomerOrderFulfillment['lines'][number] | null)[] | null;
};

type RawCustomerOrderDetail = Omit<
    CustomerOrderDetail,
    'lines' | 'shippingLines' | 'payments' | 'fulfillments' | 'couponCodes' | 'discounts' | 'taxSummary'
> & {
    lines?: (CustomerOrderLine | null)[] | null;
    shippingLines?: (AccountShippingLine | null)[] | null;
    payments?: (CustomerOrderPayment | null)[] | null;
    fulfillments?: (RawCustomerOrderFulfillment | null)[] | null;
    couponCodes?: string[] | null;
    discounts?: (CustomerOrderDiscount | null)[] | null;
    taxSummary?: (CustomerOrderTaxSummary | null)[] | null;
};

type RawAccountCustomer = Omit<AccountCustomer, 'addresses' | 'orders'> & {
    addresses?: (CustomerAddress | null)[] | null;
    orders: {
        items?: (RawCustomerOrderSummary | null)[] | null;
        totalItems: number;
    };
};

export interface GetCustomerAccountDataResponse {
    activeCustomer: RawAccountCustomer | null;
    availableCountries: (StorefrontCountry | null)[] | null;
}

export interface GetCustomerOrderDetailResponse {
    orderByCode: RawCustomerOrderDetail | null;
}

interface UpdateCustomerResponse {
    updateCustomer: {
        id: string;
    };
}

interface UpdateCustomerPasswordResponse {
    updateCustomerPassword: AccountMutationResult;
}

interface RequestCustomerEmailChangeResponse {
    requestUpdateCustomerEmailAddress: AccountMutationResult;
}

interface ConfirmCustomerEmailChangeResponse {
    updateCustomerEmailAddress: AccountMutationResult;
}

interface SaveCustomerAddressResponse {
    createCustomerAddress?: {
        id: string;
    };
    updateCustomerAddress?: {
        id: string;
    };
}

interface DeleteCustomerAddressResponse {
    deleteCustomerAddress: {
        success: boolean;
    };
}

const CUSTOMER_ADDRESS_FRAGMENT = /* GraphQL */ `
    fragment CustomerAddressFields on Address {
        id
        createdAt
        updatedAt
        fullName
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        phoneNumber
        defaultShippingAddress
        defaultBillingAddress
        country {
            id
            code
            name
            enabled
        }
    }
`;

const CUSTOMER_ORDER_LINE_FRAGMENT = /* GraphQL */ `
    fragment CustomerOrderLineFields on OrderLine {
        id
        quantity
        unitPriceWithTax
        discountedUnitPriceWithTax
        linePriceWithTax
        discountedLinePriceWithTax
        featuredAsset {
            id
            preview
        }
        productVariant {
            id
            name
            sku
        }
    }
`;

const CUSTOMER_ORDER_PAYMENT_FRAGMENT = /* GraphQL */ `
    fragment CustomerOrderPaymentFields on Payment {
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
`;

const CUSTOMER_ORDER_FULFILLMENT_FRAGMENT = /* GraphQL */ `
    fragment CustomerOrderFulfillmentFields on Fulfillment {
        id
        createdAt
        updatedAt
        state
        method
        trackingCode
        lines {
            orderLineId
            quantity
            orderLine {
                id
                productVariant {
                    id
                    name
                    sku
                }
            }
        }
    }
`;

const CUSTOMER_ORDER_SUMMARY_FRAGMENT = /* GraphQL */ `
    fragment CustomerOrderSummaryFields on Order {
        id
        code
        state
        active
        createdAt
        updatedAt
        orderPlacedAt
        totalQuantity
        subTotalWithTax
        shippingWithTax
        totalWithTax
        currencyCode
        lines {
            ...CustomerOrderLineFields
        }
        shippingLines {
            id
            priceWithTax
            discountedPriceWithTax
            shippingMethod {
                id
                code
                name
                description
            }
        }
        payments {
            ...CustomerOrderPaymentFields
        }
        fulfillments {
            ...CustomerOrderFulfillmentFields
        }
    }
    ${CUSTOMER_ORDER_LINE_FRAGMENT}
    ${CUSTOMER_ORDER_PAYMENT_FRAGMENT}
    ${CUSTOMER_ORDER_FULFILLMENT_FRAGMENT}
`;

const CUSTOMER_ORDER_DETAIL_FRAGMENT = /* GraphQL */ `
    fragment CustomerOrderDetailFields on Order {
        ...CustomerOrderSummaryFields
        subTotal
        shipping
        total
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
        couponCodes
        discounts {
            description
            amountWithTax
        }
        taxSummary {
            description
            taxRate
            taxBase
            taxTotal
        }
    }
    ${CUSTOMER_ORDER_SUMMARY_FRAGMENT}
`;

export const GET_CUSTOMER_ACCOUNT_DATA_QUERY = /* GraphQL */ `
    query GetCustomerAccountData {
        activeCustomer {
            id
            createdAt
            updatedAt
            title
            firstName
            lastName
            phoneNumber
            emailAddress
            addresses {
                ...CustomerAddressFields
            }
            orders {
                totalItems
                items {
                    ...CustomerOrderSummaryFields
                }
            }
        }
        availableCountries {
            id
            code
            name
            enabled
        }
    }
    ${CUSTOMER_ADDRESS_FRAGMENT}
    ${CUSTOMER_ORDER_SUMMARY_FRAGMENT}
`;

export const GET_CUSTOMER_ORDER_DETAIL_QUERY = /* GraphQL */ `
    query GetCustomerOrderDetail($code: String!) {
        orderByCode(code: $code) {
            ...CustomerOrderDetailFields
        }
    }
    ${CUSTOMER_ORDER_DETAIL_FRAGMENT}
`;

const UPDATE_CUSTOMER_MUTATION = /* GraphQL */ `
    mutation UpdateCustomerProfile($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) {
            id
        }
    }
`;

const UPDATE_CUSTOMER_PASSWORD_MUTATION = /* GraphQL */ `
    mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
        updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
            __typename
            ... on Success {
                success
            }
            ... on InvalidCredentialsError {
                errorCode
                message
                authenticationError
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

const REQUEST_CUSTOMER_EMAIL_CHANGE_MUTATION = /* GraphQL */ `
    mutation RequestCustomerEmailChange($password: String!, $newEmailAddress: String!) {
        requestUpdateCustomerEmailAddress(password: $password, newEmailAddress: $newEmailAddress) {
            __typename
            ... on Success {
                success
            }
            ... on InvalidCredentialsError {
                errorCode
                message
                authenticationError
            }
            ... on EmailAddressConflictError {
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

const CONFIRM_CUSTOMER_EMAIL_CHANGE_MUTATION = /* GraphQL */ `
    mutation ConfirmCustomerEmailChange($token: String!) {
        updateCustomerEmailAddress(token: $token) {
            __typename
            ... on Success {
                success
            }
            ... on IdentifierChangeTokenInvalidError {
                errorCode
                message
            }
            ... on IdentifierChangeTokenExpiredError {
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

const CREATE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
    mutation CreateCustomerAddress($input: CreateAddressInput!) {
        createCustomerAddress(input: $input) {
            id
        }
    }
`;

const UPDATE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
    mutation UpdateCustomerAddress($input: UpdateAddressInput!) {
        updateCustomerAddress(input: $input) {
            id
        }
    }
`;

const DELETE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
    mutation DeleteCustomerAddress($id: ID!) {
        deleteCustomerAddress(id: $id) {
            success
        }
    }
`;

function sortOrdersByDate<T extends { orderPlacedAt?: string | null; createdAt: string }>(orders: T[]): T[] {
    return [...orders].sort((left, right) => {
        const leftDate = left.orderPlacedAt || left.createdAt;
        const rightDate = right.orderPlacedAt || right.createdAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });
}

function compactList<T>(items?: (T | null)[] | null): T[] {
    return (items ?? []).filter((item): item is T => item !== null);
}

function normalizeFulfillment(fulfillment: RawCustomerOrderFulfillment): CustomerOrderFulfillment {
    return {
        ...fulfillment,
        lines: compactList(fulfillment.lines),
    };
}

function normalizeOrderSummary(order: RawCustomerOrderSummary): CustomerOrderSummary {
    return {
        ...order,
        lines: compactList(order.lines),
        shippingLines: compactList(order.shippingLines),
        payments: compactList(order.payments),
        fulfillments: compactList(order.fulfillments).map(normalizeFulfillment),
    };
}

export function normalizeOrderDetail(order: RawCustomerOrderDetail): CustomerOrderDetail {
    return {
        ...order,
        lines: compactList(order.lines),
        shippingLines: compactList(order.shippingLines),
        payments: compactList(order.payments),
        fulfillments: compactList(order.fulfillments).map(normalizeFulfillment),
        couponCodes: order.couponCodes ?? [],
        discounts: compactList(order.discounts),
        taxSummary: compactList(order.taxSummary),
    };
}

export function normalizeAccountData(data: GetCustomerAccountDataResponse): CustomerAccountData {
    if (!data.activeCustomer) {
        return {
            customer: null,
            availableCountries: compactList(data.availableCountries).filter((country) => country.enabled),
        };
    }

    return {
        customer: {
            ...data.activeCustomer,
            addresses: compactList(data.activeCustomer.addresses),
            orders: sortOrdersByDate(compactList(data.activeCustomer.orders.items).map(normalizeOrderSummary)),
        },
        availableCountries: compactList(data.availableCountries).filter((country) => country.enabled),
    };
}

function normalizeOptionalText(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function getAccountMutationMessage(result: AccountMutationResult, fallbackMessage: string): OperationResult {
    const message =
        result.validationErrorMessage ||
        result.authenticationError ||
        result.message ||
        fallbackMessage;

    if (
        result.errorCode ||
        (result.__typename && result.__typename !== 'Success' && result.__typename.endsWith('Error'))
    ) {
        return {
            success: false,
            message,
            errorCode: result.errorCode || undefined,
        };
    }

    return {
        success: true,
    };
}

export async function getCustomerAccountData(): Promise<CustomerAccountData> {
    const data = await fetchShopApi<GetCustomerAccountDataResponse>(GET_CUSTOMER_ACCOUNT_DATA_QUERY);
    return normalizeAccountData(data);
}

export async function getCustomerOrderDetail(code: string): Promise<CustomerOrderDetail | null> {
    const data = await fetchShopApi<GetCustomerOrderDetailResponse>(GET_CUSTOMER_ORDER_DETAIL_QUERY, { code });
    return data.orderByCode ? normalizeOrderDetail(data.orderByCode) : null;
}

export async function updateCustomerProfile(input: UpdateCustomerProfileInput): Promise<OperationResult> {
    try {
        await fetchShopApi<UpdateCustomerResponse>(UPDATE_CUSTOMER_MUTATION, {
            input: {
                title: normalizeOptionalText(input.title),
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                phoneNumber: normalizeOptionalText(input.phoneNumber),
            },
        });

        return {
            success: true,
            message: 'Tus datos de contacto se actualizaron correctamente.',
        };
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos actualizar tus datos.');
    }
}

export async function updateCustomerPassword(
    input: UpdateCustomerPasswordInput,
): Promise<OperationResult> {
    try {
        const data = await fetchShopApi<UpdateCustomerPasswordResponse>(
            UPDATE_CUSTOMER_PASSWORD_MUTATION,
            {
                currentPassword: input.currentPassword,
                newPassword: input.newPassword,
            },
        );

        const result = getAccountMutationMessage(
            data.updateCustomerPassword,
            'No pudimos actualizar tu contraseña.',
        );

        return result.success
            ? {
                  success: true,
                  message: 'Tu contraseña se actualizó correctamente.',
              }
            : result;
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos actualizar tu contraseña.');
    }
}

export async function requestCustomerEmailChange(
    input: CustomerEmailChangeInput,
): Promise<OperationResult> {
    try {
        const data = await fetchShopApi<RequestCustomerEmailChangeResponse>(
            REQUEST_CUSTOMER_EMAIL_CHANGE_MUTATION,
            {
                password: input.password,
                newEmailAddress: input.newEmailAddress.trim(),
            },
        );

        const result = getAccountMutationMessage(
            data.requestUpdateCustomerEmailAddress,
            'No pudimos iniciar el cambio de email.',
        );

        return result.success
            ? {
                  success: true,
                  message:
                      'Te enviamos un enlace de confirmación al nuevo email para completar el cambio.',
              }
            : result;
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos iniciar el cambio de email.');
    }
}

export async function confirmCustomerEmailChange(token: string): Promise<OperationResult> {
    try {
        const data = await fetchShopApi<ConfirmCustomerEmailChangeResponse>(
            CONFIRM_CUSTOMER_EMAIL_CHANGE_MUTATION,
            { token },
        );

        const result = getAccountMutationMessage(
            data.updateCustomerEmailAddress,
            'No pudimos confirmar el cambio de email.',
        );

        return result.success
            ? {
                  success: true,
                  message: 'Tu email de acceso quedó actualizado.',
              }
            : result;
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos confirmar el cambio de email.');
    }
}

export async function saveCustomerAddress(input: CustomerAddressInput): Promise<OperationResult> {
    const payload = {
        fullName: input.fullName.trim(),
        company: normalizeOptionalText(input.company),
        streetLine1: input.streetLine1.trim(),
        streetLine2: normalizeOptionalText(input.streetLine2),
        city: input.city.trim(),
        province: normalizeOptionalText(input.province),
        postalCode: input.postalCode.trim(),
        countryCode: input.countryCode,
        phoneNumber: normalizeOptionalText(input.phoneNumber),
        defaultShippingAddress: input.defaultShippingAddress,
        defaultBillingAddress: input.defaultBillingAddress,
    };

    try {
        if (input.id) {
            await fetchShopApi<SaveCustomerAddressResponse>(UPDATE_CUSTOMER_ADDRESS_MUTATION, {
                input: {
                    id: input.id,
                    ...payload,
                },
            });

            return {
                success: true,
                message: 'La dirección se actualizó correctamente.',
            };
        }

        await fetchShopApi<SaveCustomerAddressResponse>(CREATE_CUSTOMER_ADDRESS_MUTATION, {
            input: payload,
        });

        return {
            success: true,
            message: 'La dirección se guardó correctamente.',
        };
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos guardar la dirección.');
    }
}

export async function deleteCustomerAddress(id: string): Promise<OperationResult> {
    try {
        const data = await fetchShopApi<DeleteCustomerAddressResponse>(DELETE_CUSTOMER_ADDRESS_MUTATION, {
            id,
        });

        if (!data.deleteCustomerAddress.success) {
            return {
                success: false,
                message: 'No pudimos eliminar la dirección.',
            };
        }

        return {
            success: true,
            message: 'La dirección se eliminó correctamente.',
        };
    } catch (error) {
        return getOperationResultMessage(error, 'No pudimos eliminar la dirección.');
    }
}
