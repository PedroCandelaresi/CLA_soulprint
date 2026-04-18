import AccountOrderDetail from '@/components/account/AccountOrderDetail';

interface PageProps {
    params: Promise<{ code: string }>;
}

export default async function CustomerAccountOrderDetailPage({ params }: PageProps) {
    const { code } = await params;

    return <AccountOrderDetail code={code} />;
}
