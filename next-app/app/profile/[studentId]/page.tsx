import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import PublicProfileView from '@/components/profile/PublicProfileView';
import RedirectIfSignedIn from '@/components/profile/RedirectIfSignedIn';
import { getPublicProfile } from '@/lib/profile/public-profile';
import { getDisplayName } from '@/lib/utils';

type Props = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { studentId } = await params;
    const result = await getPublicProfile(studentId);
    if (result.status !== 'ok') return { title: 'Profile · ICPC HUE', robots: { index: false } };

    const { profile } = result;
    const name = getDisplayName(profile.name) || 'ICPC HUE member';
    const title = `${name} · ICPC HUE`;
    const description = profile.stats.solved > 0
        ? `${profile.stats.solved} problems solved across ${profile.stats.sheetsStarted} sheets on ICPC HUE.`
        : 'Competitive programming profile on ICPC HUE.';
    return {
        title,
        description,
        openGraph: { title, description, url: `/profile/${studentId}`, siteName: 'ICPC HUE', type: 'profile' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function PublicProfilePage({ params }: Props) {
    const { studentId } = await params;
    const result = await getPublicProfile(studentId);

    if (result.status !== 'ok') {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center text-white px-6 text-center">
                <Lock className="w-12 h-12 text-white/30 mb-4" />
                <h1 className="text-xl font-semibold mb-2">{result.status === 'private' ? 'This profile is private' : 'Profile not found'}</h1>
                <p className="text-sm text-white/45 mb-6">It may be private or the ID doesn&apos;t exist.</p>
                <Link href="/" className="h-10 px-5 inline-flex items-center bg-[#E8C15A] text-black text-sm font-semibold rounded-xl hover:bg-[#d4ad45]">Go home</Link>
            </div>
        );
    }

    return (
        <div className="ui-compact min-h-screen bg-[#0B0B0C] text-white">
            <RedirectIfSignedIn to={`/dashboard/profile/${studentId}`} />
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/" className="text-sm font-semibold tracking-tight text-[#E8C15A]">ICPC HUE</Link>
                    <Link href="/apply" className="text-sm text-white/50 hover:text-white transition-colors">Join the training →</Link>
                </div>
                <PublicProfileView profile={result.profile} />
            </div>
        </div>
    );
}
