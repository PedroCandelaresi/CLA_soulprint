import AuthPageShell from '@/components/auth/AuthPageShell';
import LoginForm from '@/components/auth/LoginForm';

interface LoginPageProps {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] || null;
    }
    return value || null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const nextParam = getSearchParamValue(resolvedSearchParams?.next);
    const oauthError = getSearchParamValue(resolvedSearchParams?.error);

    return (
        <AuthPageShell
            title="Ingresá a tu cuenta"
            subtitle="Necesitás estar autenticado para finalizar la compra. También podés entrar con Google y volver directo al carrito."
            footerText="¿Todavía no tenés cuenta?"
            footerLinkLabel="Registrate"
            footerHref={nextParam ? `/auth/register?next=${encodeURIComponent(nextParam)}` : '/auth/register'}
        >
            <LoginForm nextParam={nextParam} oauthError={oauthError} />
        </AuthPageShell>
    );
}
