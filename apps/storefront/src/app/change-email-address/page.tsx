import AuthPageShell from '@/components/auth/AuthPageShell';
import ChangeEmailConfirmForm from '@/components/auth/ChangeEmailConfirmForm';

interface ChangeEmailAddressPageProps {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function getSearchParamValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] || null;
    }
    return value || null;
}

function normalizeToken(value: string | null): string | null {
    if (!value) {
        return null;
    }
    return value.replace(/ /g, '+').trim();
}

export default async function ChangeEmailAddressPage({ searchParams }: ChangeEmailAddressPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const token = normalizeToken(getSearchParamValue(resolvedSearchParams?.token));

    return (
        <AuthPageShell
            title="Confirmá tu nuevo email"
            subtitle="Este paso termina el cambio de email solicitado desde tu cuenta."
            footerText="¿Preferís volver al dashboard?"
            footerLinkLabel="Ir a mi cuenta"
            footerHref="/auth/account"
        >
            <ChangeEmailConfirmForm token={token} />
        </AuthPageShell>
    );
}
