'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/dashboard/PageHeader';
import Providers from '@/components/core/Providers';
import { useAuth } from '@/contexts/AuthContext';
import { camps } from '@/lib/sessionData';
import { getEmbedUrl, getDirectWatchUrl } from '@/lib/video/videoUtils';
import { SessionWatchProvider, TrackedYouTube } from '@/components/sessions/SessionWatch';

/** The 11-character YouTube id behind an id or URL, or null for other hosts (Drive). */
function youTubeId(videoIdOrUrl: string): string | null {
    const embed = getEmbedUrl(videoIdOrUrl);
    return /youtube(-nocookie)?\.com\/embed\/([\w-]{11})/.exec(embed)?.[2] ?? null;
}

function DashboardSessionContent() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    // params can assume string as per Next.js App Router dynamic segments
    const campSlug = params.campSlug as string;
    const sessionSlug = params.sessionSlug as string;

    const [authChecked, setAuthChecked] = useState(false);
    const [viewCount, setViewCount] = useState<number | null>(null);

    // Find Session
    const camp = camps.find(c => c.slug === campSlug);
    // Find by slug first, then fallback to number (for backward compatibility during transition if needed)
    const session = camp?.sessions.find(s => s.slug === sessionSlug || s.number === sessionSlug);

    useEffect(() => {
        if (!loading) {
            setTimeout(() => setAuthChecked(true), 0);
            if (!isAuthenticated) {
                router.replace('/login');
            } else if (session) {
                // Fetch/Increment views
                // Use a composite ID: campSlug-sessionNumber (keeping legacy ID for view consistency)
                const entityId = `${campSlug}-${session.number}`;

                const fetchViews = async () => {
                    try {
                        const res = await fetch('/api/views', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                entityType: 'session',
                                entityId: entityId
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            setViewCount(data.views);
                        }
                    } catch (err) {
                        console.error('Error fetching views:', err);
                    }
                };
                fetchViews();
            }
        }
    }, [loading, isAuthenticated, router, campSlug, sessionSlug, session]);

    if (loading || !authChecked || !isAuthenticated) {
        return (
            <div className="font-sans text-white space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto" role="status" aria-label="Loading session">
                <div>
                    <Skeleton className="h-6 w-24 rounded-full mb-4" />
                    <Skeleton className="h-10 sm:h-12 w-3/4 max-w-xl rounded-xl mb-4" />
                    <Skeleton className="h-5 w-full max-w-2xl rounded" />
                </div>
                <div className="aspect-video w-full bg-[#121214] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Skeleton className="w-6 h-6 rounded-md" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-xl bg-[#121214] border border-white/5 space-y-2">
                            <Skeleton className="h-4 w-24 rounded" />
                            <Skeleton className="h-3 w-36 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!camp || !session) {
        return (
            <div className="text-white p-8 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold mb-4">Session Not Found</h1>
                <Link href="/dashboard/sessions" className="text-[#E8C15A] hover:underline">Return to Sessions</Link>
            </div>
        );
    }

    const ytId = session.videoId ? youTubeId(session.videoId) : null;

    return (
        <SessionWatchProvider campSlug={camp.slug} sessionSlug={session.slug} videoId={ytId ?? undefined}>
        <div className="font-sans text-white space-y-8 animate-fade-in pb-16">
            <div className="space-y-2">
                <p className="font-mono text-xs text-white/50">
                    {(session.tag || 'Session').charAt(0).toUpperCase() + (session.tag || 'Session').slice(1).toLowerCase()}
                </p>
                <PageHeader
                    title={session.title}
                    subtitle={session.description}
                    action={viewCount !== null ? <span className="shrink-0 font-mono text-sm text-white/50">{viewCount} views</span> : undefined}
                />
            </div>

            <div>
                {session.videoId ? (
                    <div className="aspect-video w-full bg-[#121214] rounded-2xl border border-white/10 overflow-hidden">
                        {ytId ? (
                            <TrackedYouTube videoId={ytId} title={session.title} fallbackSrc={getEmbedUrl(session.videoId)} />
                        ) : (
                            <iframe
                                src={getEmbedUrl(session.videoId)}
                                width="100%"
                                height="100%"
                                allow="autoplay; fullscreen"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        )}
                    </div>
                ) : (
                    <div className="aspect-video w-full bg-[#121214] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
                        <div className="text-center px-6">
                            <p className="text-white/60 font-semibold text-sm sm:text-base">الفيديو هيكون متاح قريب</p>
                            <p className="text-white/30 text-xs mt-1">Video coming soon</p>
                        </div>
                    </div>
                )}
                {session.videoId && (() => {
                    const direct = getDirectWatchUrl(session.videoId);
                    return (
                        <p className="mt-3 text-xs text-white/40">
                            If the video doesn&apos;t load, <a href={direct.url} target="_blank" rel="noopener noreferrer" className="text-[#E8C15A] hover:underline">watch on {direct.platform}</a>
                        </p>
                    );
                })()}
            </div>

            <h2 className="border-t border-white/[0.06] pt-8 text-2xl font-medium text-white">Session notes</h2>

            <article className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-[#E8C15A] prose-strong:text-white prose-code:text-[#E8C15A] prose-pre:bg-[#121214] prose-pre:border prose-pre:border-white/10">
                {session.content}
            </article>
        </div>
        </SessionWatchProvider>
    );
}

export default function DashboardSessionDetail() {
    return <Providers><DashboardSessionContent /></Providers>;
}
