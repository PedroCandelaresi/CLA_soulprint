import AuthPageShell from '@/components/auth/AuthPageShell';
import VerifyAccountForm from '@/components/auth/VerifyAccountForm';

interface VerifyPageProps {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] || null;
    }
    return value || null;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const token = getSearchParamValue(resolvedSearchParams?.token);
    const nextParam = getSearchParamValue(resolvedSearchParams?.next);

    return (
        <AuthPageShell
            title="Activá tu cuenta"
            subtitle="Definí tu contraseña para verificar el email y quedar listo para volver al carrito."
            footerText="¿Ya activaste la cuenta?"
            footerLinkLabel="Ingresá"
            footerHref={nextParam ? `/auth/login?next=${encodeURIComponent(nextParam)}` : '/auth/login'}
        >
            <VerifyAccountForm token={token} nextParam={nextParam} />
        </AuthPageShell>
    );
}
