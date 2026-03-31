import AuthPageShell from '@/components/auth/AuthPageShell';
import RegisterForm from '@/components/auth/RegisterForm';

interface RegisterPageProps {
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

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const nextParam = getSearchParamValue(resolvedSearchParams?.next);

    return (
        <AuthPageShell
            title="Creá tu cuenta"
            subtitle="Antes de pagar necesitás una cuenta verificada. Registrate, confirmá tu email y después volvés al carrito."
            footerText="¿Ya tenés cuenta?"
            footerLinkLabel="Ingresá"
            footerHref={nextParam ? `/auth/login?next=${encodeURIComponent(nextParam)}` : '/auth/login'}
        >
            <RegisterForm nextParam={nextParam} />
        </AuthPageShell>
    );
}
