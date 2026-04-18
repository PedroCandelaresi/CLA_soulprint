export const PERSONALIZATION_PSP_RESOLVER = Symbol('PERSONALIZATION_PSP_RESOLVER');

export interface PersonalizationPspTransaction {
    vendureOrderCode: string;
    status: string;
}

/**
 * Provider-agnostic resolver used by PersonalizationService.authorize()
 * to match an external PSP transaction id against a Vendure order.
 *
 * Implementations should return `null` when the transaction is unknown
 * or when the integration is not configured.
 */
export interface PersonalizationPspResolver {
    findTransactionById(transactionId: string): Promise<PersonalizationPspTransaction | null>;
}

export const NoopPersonalizationPspResolver: PersonalizationPspResolver = {
    async findTransactionById() {
        return null;
    },
};
