import { CustomerAccountProvider } from '@/components/account/CustomerAccountProvider';
import { CustomerAccountShell } from '@/components/account/CustomerAccountShell';
import { requireCustomerSession } from '@/lib/auth/session';
import {
    GET_CUSTOMER_ACCOUNT_DATA_QUERY,
    normalizeAccountData,
    type GetCustomerAccountDataResponse,
} from '@/lib/vendure/account';
import { fetchServerShopApi } from '@/lib/vendure/server';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireCustomerSession('/mi-cuenta');

    let initialData = null;
    let initialError: string | null = null;

    try {
        const data = await fetchServerShopApi<GetCustomerAccountDataResponse>(
            GET_CUSTOMER_ACCOUNT_DATA_QUERY,
        );
        initialData = normalizeAccountData(data);
    } catch (error) {
        console.error('No se pudo hidratar el centro de cuenta desde servidor', error);
        initialError = 'No pudimos preparar tu cuenta en este momento. Probá nuevamente en unos segundos.';
    }

    return (
        <CustomerAccountProvider initialData={initialData} initialError={initialError}>
            <CustomerAccountShell>{children}</CustomerAccountShell>
        </CustomerAccountProvider>
    );
}
