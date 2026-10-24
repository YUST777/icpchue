import { notFound } from 'next/navigation';
import PublicProfileView from '@/components/profile/PublicProfileView';
import { getPublicProfile } from '@/lib/profile/public-profile';

export default async function DashboardPublicProfile({ params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await params;
    const result = await getPublicProfile(studentId);

    if (result.status === 'not_found') notFound();
    if (result.status === 'private') {
        return <div className="p-8 text-center text-sm text-white/50">This profile is private.</div>;
    }

    return (
        <div className="ui-compact p-4 md:p-8 max-w-4xl mx-auto">
            <PublicProfileView profile={result.profile} />
        </div>
    );
}
