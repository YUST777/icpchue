'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Eye } from 'lucide-react';
import Providers from '@/components/Providers';
import { camps } from '@/lib/sessionData';

function SessionContent() {
    const params = useParams();
    // params can assume string as per Next.js App Router dynamic segments
    const campSlug = params.campSlug as string;
    const sessionNumber = params.sessionNumber as string;

    const [viewCount, setViewCount] = useState<number | null>(null);

    // Find Session
    const camp = camps.find(c => c.slug === campSlug);
    const session = camp?.sessions.find(s => s.number === sessionNumber);

    useEffect(() => {
        if (session) {
            // Fetch/Increment views
            // Use a composite ID: campSlug-sessionNumber
            const entityId = `${campSlug}-${sessionNumber}`;

            const fetchViews = async () => {
                // Determine logic for view counting on public pages. 
                // We might not want to increment on every visit without auth, or maybe we do.
                // For now, let's just fetch view counts or maybe increment if we want to track public views.
                // The dashboard implementation increments. Let's assume we want to increment here too.
                // However, the API might require auth? 
                // The implementation plan says: "View Counter: Update view counter to use composite IDs...".
                // And "Add a view counter to Sessions and News items."
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
    }, [campSlug, sessionNumber, session]);

    if (!camp || !session) {
        return (
            <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
                <Link href="/sessions" className="text-[#d59928] hover:underline">Return to Sessions</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href={`/sessions/${campSlug}`} className="flex items-center gap-2 text-white/70 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to {camp.title}</span>
                    </Link>
                    <div className="font-bold text-lg">
                        {/* <span className="text-white/50 mr-2">{camp.title}</span> */}
                        Session <span className="text-[#d59928]">{session.displayNumber || session.number}</span>
                    </div>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
                <div className="mb-8 sm:mb-12">
                    <span className="inline-block px-3 py-1 bg-[#d59928]/10 text-[#d59928] border border-[#d59928]/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4">{session.tag}</span>
                    <h1 className="text-3xl sm:text-5xl font-black mb-4">{session.title}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-lg text-white/60 max-w-2xl">{session.description}</p>
                        {viewCount !== null && (
                            <div className="flex items-center gap-2 text-white/40 bg-white/5 px-3 py-1.5 rounded-full self-start sm:self-auto">
                                <Eye size={16} />
                                <span className="text-sm font-medium">{viewCount} views</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mb-12 sm:mb-16">
                    {session.videoId ? (
                        <div className="aspect-video w-full bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <iframe
                                src={`https://drive.google.com/file/d/${session.videoId.includes('google.com') ? session.videoId.split('/d/')[1].split('/')[0] : session.videoId}/preview`}
                                width="100%"
                                height="100%"
                                allow="autoplay; fullscreen"
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    ) : (
                        <div className="aspect-video w-full bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                            <p className="text-white/40">No video available</p>
                        </div>
                    )}
                    <div className="mt-4 px-2">
                        <p className="text-sm text-white/40 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            If video doesn&apos;t load, <a href={`https://drive.google.com/file/d/${session.videoId}/view?usp=sharing`} target="_blank" rel="noopener noreferrer" className="text-[#d59928] hover:underline">watch on Drive</a>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-white/30 text-sm font-mono uppercase tracking-widest">Session Notes</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <article className="prose prose-invert prose-lg max-w-none">{session.content}</article>
            </div>
        </div>
    );
}

export default function SessionDetail() {
    return <Providers><SessionContent /></Providers>;
}
