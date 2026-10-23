import { requireDashboardRole } from '@/lib/auth/server-guards';

export default async function MentorDashboardLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireDashboardRole(['mentor', 'instructor', 'owner'], '/dashboard/mentor');
    // .mentor-ui: exempt from the generic mobile button/input rules in globals.css.
    return <div className="mentor-ui">{children}</div>;
}
