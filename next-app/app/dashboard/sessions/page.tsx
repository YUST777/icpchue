'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CalendarClock, ChevronRight, Folder, Play } from 'lucide-react';
import { camps, CURRENT_SEASON, SEASONS, type Season } from '@/lib/sessionData';

const SEASON_LABELS: Record<Season, string> = {
    '2027': 'Season 2027',
    '2026': 'Season 2026',
};

function SessionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requested = searchParams.get('season');
    const season: Season = SEASONS.includes(requested as Season) ? (requested as Season) : CURRENT_SEASON;

    const visibleCamps = camps.filter(camp => camp.dashboardVisible !== false && camp.season === season);

    const selectSeason = (next: Season) => {
        router.replace(next === CURRENT_SEASON ? '/dashboard/sessions' : `/dashboard/sessions?season=${next}`, { scroll: false });
    };

    return (
        <div className="font-sans text-white space-y-8 animate-fade-in pb-12">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 md:p-8 border border-white/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-[#E8C15A]/10">
                        <Play className="text-[#E8C15A]" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">Training Sessions</h1>
                        <p className="text-[#A0A0A0] text-sm mt-1">Exclusive Live & Recorded Training Camps</p>
                    </div>
                </div>
                <p className="text-[#808080] text-sm leading-relaxed max-w-2xl">
                    Explore our collection of specialized training sessions and camps.
                    From seasonal workshops to advanced problem-solving intensives, access all materials in one place.
                </p>
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-[#F2F2F2]">Available Camps</h2>
                    <div role="tablist" aria-label="Season" className="inline-flex p-1 rounded-xl bg-[#141414] border border-white/10">
                        {SEASONS.map((s) => {
                            const active = s === season;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => selectSeason(s)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-[#E8C15A] text-[#0B0B0C]' : 'text-[#A0A0A0] hover:text-white'}`}
                                >
                                    {SEASON_LABELS[s]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {visibleCamps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-white/10 bg-[#0f0f0f] px-6 py-16">
                        <CalendarClock className="w-10 h-10 text-[#E8C15A]/70 mb-3" />
                        <p className="text-base font-semibold text-white">{SEASON_LABELS[season]} sessions are coming soon</p>
                        <p className="text-sm text-[#808080] mt-1 max-w-md">
                            New recordings appear here after each session. Meanwhile, last season&apos;s camps are still open.
                        </p>
                        {season !== '2026' && (
                            <button
                                type="button"
                                onClick={() => selectSeason('2026')}
                                className="mt-5 px-4 py-2 rounded-lg bg-[#161616] border border-white/10 text-sm font-semibold text-white/90 hover:text-[#E8C15A] hover:border-white/20 transition-colors"
                            >
                                Browse Season 2026
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {visibleCamps.map((group) => (
                            <Link
                                key={group.slug}
                                href={`/dashboard/sessions/${group.slug}`}
                                className="group"
                            >
                                <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden h-full">
                                    <div className="bg-[#0f0f0f] rounded-[23px] relative overflow-hidden h-full flex flex-col">
                                        <div className="relative h-48 w-full overflow-hidden bg-[#1a1a1a]">
                                            {group.image && (
                                                <Image
                                                    src={group.image}
                                                    alt={group.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    className="object-cover opacity-50 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/20 to-transparent flex items-center justify-center">
                                                <Folder className="w-12 h-12 text-white/20 group-hover:text-[#E8C15A] transition-colors relative z-10" />
                                            </div>
                                        </div>

                                        <div className="relative z-10 p-5 pt-4 mt-auto">
                                            <div className="mb-3">
                                                <h3 className="text-xl font-bold text-white group-hover:text-[#E8C15A] transition-colors">
                                                    {group.title}
                                                </h3>
                                                <p className="text-xs text-gray-400">
                                                    {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <p className="text-sm text-[#808080] line-clamp-2 mb-4">{group.description}</p>

                                            <div className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 group-hover:border-white/10 transition-all">
                                                <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                                                    <span className="text-sm font-bold text-white/90 group-hover:text-[#E8C15A] transition-colors">
                                                        Open Folder
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#E8C15A] transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function SessionsPage() {
    return (
        <Suspense>
            <SessionsContent />
        </Suspense>
    );
}
