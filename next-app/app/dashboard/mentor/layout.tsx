import { requireDashboardRole } from '@/lib/auth/server-guards';

export default async function MentorDashboardLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireDashboardRole(['mentor', 'instructor', 'owner'], '/dashboard/mentor');
    return children;
}
