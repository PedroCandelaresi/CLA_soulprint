export interface StorefrontCustomer {
    id: string;
    title?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    emailAddress: string;
}

export interface ActiveOrderLineAsset {
    id?: string;
    preview: string;
}

export interface ActiveOrderLineVariant {
    id: string;
    name: string;
    sku?: string | null;
}

export interface StorefrontOrderAddress {
    fullName?: string | null;
    company?: string | null;
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    countryCode?: string | null;
    phoneNumber?: string | null;
}

export interface ActiveOrderShippingMethod {
    id: string;
    code: string;
    name: string;
    description?: string | null;
}

export interface ActiveOrderShippingLine {
    id: string;
    priceWithTax: number;
    shippingMethod: ActiveOrderShippingMethod;
}

export interface EligibleShippingMethod {
    id: string;
    code: string;
    name: string;
    description: string;
    price: number;
    priceWithTax: number;
}

export interface EligiblePaymentMethod {
    id: string;
    code: string;
    name: string;
    description: string;
    isEligible: boolean;
    eligibilityMessage?: string | null;
    storefrontDisplay: {
        sectionTitle?: string | null;
        footerText?: string | null;
        title: string;
        cardDescription: string;
        instructionsTitle?: string | null;
        instructions?: string | null;
        buttonLabel: string;
        icon?: string | null;
    };
}

export interface StorefrontPaymentMetadataPublic {
    environment?: string;
    externalReference?: string;
    preferenceId?: string;
    initPoint?: string | null;
    sandboxInitPoint?: string | null;
    paymentId?: string;
    status?: string;
    statusDetail?: string;
    preferenceCreatedAt?: string | null;
    lastValidatedAt?: string | null;
    lastDecision?: string;
    amountMatches?: boolean;
}

export interface StorefrontPaymentMetadata {
    public?: StorefrontPaymentMetadataPublic;
    [key: string]: unknown;
}

export interface StorefrontOrderPayment {
    id: string;
    createdAt: string;
    updatedAt: string;
    method: string;
    amount: number;
    state: string;
    transactionId?: string | null;
    errorMessage?: string | null;
    metadata?: StorefrontPaymentMetadata | null;
}

export interface ActiveOrderLine {
    id: string;
    quantity: number;
    unitPriceWithTax: number;
    linePriceWithTax: number;
    featuredAsset?: ActiveOrderLineAsset | null;
    productVariant: ActiveOrderLineVariant;
}

export interface ActiveOrder {
    __typename?: 'Order';
    id: string;
    code: string;
    state: string;
    currencyCode: string;
    totalQuantity: number;
    subTotalWithTax: number;
    shipping: number;
    shippingWithTax: number;
    totalWithTax: number;
    shippingAddress?: StorefrontOrderAddress | null;
    billingAddress?: StorefrontOrderAddress | null;
    shippingLines: ActiveOrderShippingLine[];
    payments: StorefrontOrderPayment[];
    lines: ActiveOrderLine[];
}

export interface OperationResult {
    success: boolean;
    message?: string;
    errorCode?: string;
}

export interface StorefrontCountry {
    id: string;
    code: string;
    name: string;
    enabled: boolean;
}

export interface CustomerAddress {
    id: string;
    createdAt: string;
    updatedAt: string;
    fullName?: string | null;
    company?: string | null;
    streetLine1: string;
    streetLine2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    phoneNumber?: string | null;
    defaultShippingAddress?: boolean | null;
    defaultBillingAddress?: boolean | null;
    country: StorefrontCountry;
}

export interface AccountShippingMethod {
    id: string;
    code: string;
    name: string;
    description?: string | null;
}

export interface AccountShippingLine {
    id: string;
    priceWithTax: number;
    discountedPriceWithTax?: number | null;
    shippingMethod: AccountShippingMethod;
}

export interface CustomerOrderLine {
    id: string;
    quantity: number;
    unitPriceWithTax: number;
    discountedUnitPriceWithTax?: number | null;
    linePriceWithTax: number;
    discountedLinePriceWithTax?: number | null;
    featuredAsset?: ActiveOrderLineAsset | null;
    productVariant: ActiveOrderLineVariant;
}

export interface CustomerOrderPayment {
    id: string;
    createdAt: string;
    updatedAt: string;
    method: string;
    amount: number;
    state: string;
    transactionId?: string | null;
    errorMessage?: string | null;
    metadata?: StorefrontPaymentMetadata | null;
}

export interface CustomerOrderFulfillmentLine {
    orderLineId: string;
    quantity: number;
    orderLine?: {
        id: string;
        productVariant: ActiveOrderLineVariant;
    } | null;
}

export interface CustomerOrderFulfillment {
    id: string;
    createdAt: string;
    updatedAt: string;
    state: string;
    method: string;
    trackingCode?: string | null;
    lines: CustomerOrderFulfillmentLine[];
}

export interface CustomerOrderSummary {
    id: string;
    code: string;
    state: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    orderPlacedAt?: string | null;
    totalQuantity: number;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    currencyCode: string;
    lines: CustomerOrderLine[];
    shippingLines: AccountShippingLine[];
    payments: CustomerOrderPayment[];
    fulfillments: CustomerOrderFulfillment[];
}

export interface CustomerOrderDiscount {
    description: string;
    amountWithTax: number;
}

export interface CustomerOrderTaxSummary {
    description: string;
    taxRate: number;
    taxBase: number;
    taxTotal: number;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
    subTotal: number;
    shipping: number;
    total: number;
    shippingAddress?: StorefrontOrderAddress | null;
    billingAddress?: StorefrontOrderAddress | null;
    couponCodes: string[];
    discounts: CustomerOrderDiscount[];
    taxSummary: CustomerOrderTaxSummary[];
}

export interface AccountCustomer extends StorefrontCustomer {
    createdAt: string;
    updatedAt: string;
    addresses: CustomerAddress[];
    orders: CustomerOrderSummary[];
}

export interface CustomerAccountData {
    customer: AccountCustomer | null;
    availableCountries: StorefrontCountry[];
}

export interface UpdateCustomerProfileInput {
    title?: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export interface CustomerEmailChangeInput {
    password: string;
    newEmailAddress: string;
}

export interface UpdateCustomerPasswordInput {
    currentPassword: string;
    newPassword: string;
}

export interface CustomerAddressInput {
    id?: string;
    fullName: string;
    company?: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province?: string;
    postalCode: string;
    countryCode: string;
    phoneNumber?: string;
    defaultShippingAddress: boolean;
    defaultBillingAddress: boolean;
}
