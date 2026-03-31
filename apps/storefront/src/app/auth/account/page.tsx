import AccountDashboard from '@/components/account/AccountDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function AccountPage() {
    return <AccountDashboard />;
}
