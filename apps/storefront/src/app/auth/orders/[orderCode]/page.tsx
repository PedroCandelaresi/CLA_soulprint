import OrderDetailView from '@/components/account/OrderDetailView';

interface OrderDetailPageProps {
    params: { orderCode: string } | Promise<{ orderCode: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    const resolvedParams = await params;
    return <OrderDetailView orderCode={resolvedParams.orderCode} />;
}
