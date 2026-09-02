import { requireDashboardRole } from '@/lib/auth/server-guards';

export default async function AdminDashboardLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireDashboardRole(['instructor', 'owner'], '/dashboard/admin');
    return children;
}
