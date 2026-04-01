import AuthPageShell from '@/components/auth/AuthPageShell';
import PasswordResetRequestForm from '@/components/auth/PasswordResetRequestForm';
import PasswordResetConfirmForm from '@/components/auth/PasswordResetConfirmForm';

interface PasswordResetPageProps {
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

function normalizeResetToken(value: string | null): string | null {
    if (!value) {
        return null;
    }
    return value.replace(/ /g, '+').trim();
}

export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const token = normalizeResetToken(getSearchParamValue(resolvedSearchParams?.token));

    if (token) {
        return (
            <AuthPageShell
                title="Nueva contraseña"
                subtitle="Definí tu nueva contraseña para recuperar el acceso a tu cuenta."
                footerText="¿Recordaste tu contraseña?"
                footerLinkLabel="Ingresá"
                footerHref="/auth/login"
            >
                <PasswordResetConfirmForm token={token} />
            </AuthPageShell>
        );
    }

    return (
        <AuthPageShell
            title="Recuperar contraseña"
            subtitle="Ingresá tu email y te mandamos un link para definir una nueva contraseña."
            footerText="¿Recordaste tu contraseña?"
            footerLinkLabel="Ingresá"
            footerHref="/auth/login"
        >
            <PasswordResetRequestForm />
        </AuthPageShell>
    );
}
