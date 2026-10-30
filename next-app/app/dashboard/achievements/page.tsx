'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Lock, Info } from 'lucide-react';
import dynamic from 'next/dynamic';

const Badge3D = dynamic(() => import('@/components/3d/Badge3D'), { ssr: false });
import { useAchievements } from '@/hooks/useAchievements';
import { cachedHolderStats, loadHolderStats, type HolderStats } from '@/lib/achievements/holder-stats';
import { RARITY_TEXT, holderShare, rarityFromShare, shareLabel } from '@/lib/achievements/rarity';
import AchievementDetail from '@/components/achievements/AchievementDetail';
import { ACHIEVEMENT_META, LEVEL0_SHEET_BADGES, CF_RANK_BADGES, SEASON_BADGES, SOLVED_BADGES, getAchievementMeta, isPodiumId } from '@/lib/achievements/catalog';
import { Skeleton } from '@/components/ui/Skeleton';

const PROGRESS_BADGES = ['hello-world', 'streak-3', 'streak-7', 'streak-14', 'streak-30', 'streak-60', 'comeback', 'disciplined-7', 'disciplined-program'];

interface BadgeCardProps {
    group?: string;
    id: string;
    modelPath: string;
    scale?: number;
    spin?: boolean;
    title: string;
    description: string;
    unlocked: boolean;
    rarity: 'common' | 'rare' | 'legendary';
    earnedAt?: string[];
    serial?: number;
    factory?: string;
    /** Share of members who hold it, when the numbers have loaded. */
    share?: number | null;
    isHighlighted?: boolean;
}

const badgeImage = (id: string) => `/images/achievements/badges/${id}.webp`;

function BadgeCard({
    id,
    modelPath,
    scale = 2,
    spin,
    title,
    description,
    unlocked,
    rarity,
    share,
    serial,
    isHighlighted,
    onOpen,
}: BadgeCardProps & { onOpen: () => void }) {
    return (
        <li
            id={`badge-${id}`}
            title={description}
            className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition-all duration-500 ${
                isHighlighted
                    ? 'border-[#E8C15A] shadow-[0_0_20px_rgba(232,193,90,0.35),0_0_8px_rgba(232,193,90,0.25)] scale-[1.02] bg-gradient-to-b from-[#1c1a13] to-[#151412] z-50'
                    : unlocked
                    ? 'border-white/[0.1] bg-[#121214] z-0'
                    : 'border-white/[0.05] bg-white/[0.02] z-0'
            }`}
        >
            {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#E8C15A] to-[#d4af37] text-black text-[10px] font-black tracking-wider uppercase shadow-[0_2px_8px_rgba(232,193,90,0.35)] animate-bounce flex items-center gap-1.5 whitespace-nowrap">
                    <span>✨</span>
                    <span>Unlocked!</span>
                </div>
            )}
            <button
                type="button"
                onClick={onOpen}
                title="How to get this achievement"
                aria-label={`How to get ${title}`}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-[#E8C15A] hover:border-[#E8C15A]/40 hover:bg-white/[0.1] transition-all cursor-pointer"
            >
                <Info size={14} />
            </button>

            <div className="relative w-full h-40 mb-2">
                <Badge3D
                    modelPath={modelPath}
                    scale={scale}
                    spin={spin || isHighlighted}
                    unlocked={unlocked}
                    compact
                    fallbackSrc={getAchievementMeta(id)?.imageSrc ?? badgeImage(id)}
                />
                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Lock className="w-6 h-6 text-white/60 drop-shadow" />
                    </div>
                )}
            </div>
            <h3 className={`text-sm font-medium leading-tight ${unlocked ? 'text-white' : 'text-white/40'}`}>
                {title}
            </h3>
            <p className={`text-[11px] mt-1 leading-snug line-clamp-2 ${unlocked ? 'text-white/45' : 'text-white/25'}`}>
                {description}
            </p>
            {(() => {
                const shown = share != null ? rarityFromShare(share) : rarity;
                return (
                    <span className={`mt-2 text-[10px] capitalize ${unlocked ? RARITY_TEXT[shown] : 'text-white/30'}`}>
                        {shown}{share != null && <span className="text-white/35"> · {shareLabel(share)} of members</span>}
                    </span>
                );
            })()}
            {unlocked && serial != null && (
                <span className="mt-1 font-mono text-[10px] tracking-wider text-white/35">
                    #{String(serial).padStart(4, '0')}
                </span>
            )}
        </li>
    );
}

function AchievementsContent() {
    const { user, profile: authProfile } = useAuth();
    const searchParams = useSearchParams();
    const badgeParam = searchParams?.get('badge') || null;
    const [highlightedBadgeId, setHighlightedBadgeId] = useState<string | null>(null);

    const profile = (authProfile || {}) as { 
        codeforces_data?: { rating?: string }; 
        is_approval_unlocked?: boolean; 
        sheet_1_solved?: boolean;
        achievements?: { achievement_id: string }[];
    };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [holderStats, setHolderStats] = useState<HolderStats | null>(() => cachedHolderStats());
    useEffect(() => { loadHolderStats().then(d => d && setHolderStats(d)); }, []);
    const { achievements: earned, loading } = useAchievements(Boolean(user));
    const earnedIds = new Set(earned.map(a => a.achievement_id));

    // Only the people given the badge hold it; a role alone does not unlock it.
    const isInstructorUnlocked = earnedIds.has('instructor');

    // Monthly podium: three tiles that show what can be won; each opens once the student has placed that high.
    const PODIUM_TILES = [
        { place: 1, title: 'Monthly 1st place', rarity: 'legendary' as const },
        { place: 2, title: 'Monthly 2nd place', rarity: 'rare' as const },
        { place: 3, title: 'Monthly 3rd place', rarity: 'rare' as const },
    ];
    const podiumBadges = PODIUM_TILES.map(tile => {
        const wins = earned.filter(a => isPodiumId(a.achievement_id) && a.achievement_id.endsWith(`-${tile.place}`)).map(a => getAchievementMeta(a.achievement_id)!.name.split(' · ')[0]);
        return {
            group: 'Monthly podium', id: `podium-${tile.place}`, modelPath: `/3d/podium-${tile.place}.glb`, title: tile.title,
            description: wins.length ? `Earned in ${wins.join(', ')}` : `Finish ${['1st', '2nd', '3rd'][tile.place - 1]} in a month on the Level 0 leaderboard`,
            unlocked: wins.length > 0, rarity: tile.rarity,
            earnedAt: earned.filter(a => isPodiumId(a.achievement_id) && a.achievement_id.endsWith(`-${tile.place}`)).map(a => a.earned_at),
        };
    });

    const achievements = [
        { group: 'Level 0 sheets', id: 'level0-skills', modelPath: '/3d/level0-skills.glb', title: ACHIEVEMENT_META['level0-skills'].name, description: ACHIEVEMENT_META['level0-skills'].desc, unlocked: earnedIds.has('level0-skills'), rarity: ACHIEVEMENT_META['level0-skills'].tier },
        { group: 'Milestones', id: 'welcome', modelPath: '/3d/WELCOME.glb', scale: 2, title: 'Welcome Badge', description: 'Awarded for joining ICPC HUE community', unlocked: true, rarity: 'common' as const },
        { group: 'Milestones', id: 'github-star', modelPath: '/3d/github-star.glb', scale: 2, spin: true, title: ACHIEVEMENT_META['github-star'].name, description: ACHIEVEMENT_META['github-star'].desc, unlocked: earnedIds.has('github-star'), rarity: ACHIEVEMENT_META['github-star'].tier },
        { group: 'Board', id: 'instructor', modelPath: '/3d/instructor.glb', scale: 2, title: 'Instructor', description: 'Become an ICPC HUE instructor', unlocked: isInstructorUnlocked, rarity: 'legendary' as const },
        { group: 'Milestones', id: 'rank1-march-2026', modelPath: '/3d/rank1_march.glb', scale: 1.5, title: 'Rank 1 March 2026', description: 'Achieve Rank 1 on the leaderboard during March 2026', unlocked: (profile?.achievements || []).some((a: any) => (a.achievement_id || a) === 'rank1-march-2026'), rarity: 'legendary' as const },
        ...podiumBadges,
        { group: 'Milestones', id: 'ecpc-2026', modelPath: '/3d/ecpc-2026.glb', scale: 1.3, title: ACHIEVEMENT_META['ecpc-2026'].name, description: ACHIEVEMENT_META['ecpc-2026'].desc, unlocked: earnedIds.has('ecpc-2026'), rarity: ACHIEVEMENT_META['ecpc-2026'].tier },
        ...SEASON_BADGES.map(season => ({
            group: 'Seasons', id: season.id, modelPath: `/3d/${season.id}.glb`, title: ACHIEVEMENT_META[season.id].name, description: ACHIEVEMENT_META[season.id].desc,
            unlocked: earnedIds.has(season.id), rarity: ACHIEVEMENT_META[season.id].tier,
        })),
        ...SOLVED_BADGES.map(b => ({
            group: 'Problems solved', id: b.id, modelPath: `/3d/${b.id}.glb`, title: ACHIEVEMENT_META[b.id].name, description: ACHIEVEMENT_META[b.id].desc,
            unlocked: earnedIds.has(b.id), rarity: ACHIEVEMENT_META[b.id].tier,
        })),
        ...CF_RANK_BADGES.map(rank => ({
            group: 'Codeforces', id: rank.id, modelPath: `/3d/${rank.id}.glb`, title: ACHIEVEMENT_META[rank.id].name, description: ACHIEVEMENT_META[rank.id].desc,
            unlocked: earnedIds.has(rank.id), rarity: ACHIEVEMENT_META[rank.id].tier,
        })),
        ...LEVEL0_SHEET_BADGES.map(sheet => ({
            group: 'Level 0 sheets', id: sheet.id, modelPath: `/3d/${sheet.id}.glb`, scale: 2, title: ACHIEVEMENT_META[sheet.id].name, description: ACHIEVEMENT_META[sheet.id].desc,
            unlocked: earnedIds.has(sheet.id), rarity: ACHIEVEMENT_META[sheet.id].tier,
        })),
        { group: 'Board', id: 'dev', modelPath: '/3d/dev.glb', title: ACHIEVEMENT_META.dev.name, description: ACHIEVEMENT_META.dev.desc, unlocked: earnedIds.has('dev'), rarity: ACHIEVEMENT_META.dev.tier },
        { group: 'Board', id: 'mentor', modelPath: '/3d/mentor.glb', scale: 2, title: ACHIEVEMENT_META.mentor.name, description: ACHIEVEMENT_META.mentor.desc, unlocked: earnedIds.has('mentor'), rarity: ACHIEVEMENT_META.mentor.tier },
        ...PROGRESS_BADGES.map(id => ({
            group: id.startsWith('disciplined') ? 'Discipline' : 'Streaks',
            id, modelPath: `/3d/${id}.glb`, title: ACHIEVEMENT_META[id].name, description: ACHIEVEMENT_META[id].desc,
            unlocked: earnedIds.has(id), rarity: ACHIEVEMENT_META[id].tier,
        })),
    ];

    // Attach the time each regular badge was earned.
    const earnedTimes = new Map(earned.map(a => [a.achievement_id, a.earned_at]));
    const serials = new Map(earned.map(a => [a.achievement_id, a.serial]));
    const factories = new Map(earned.map(a => [a.achievement_id, a.factory]));
    for (const a of achievements as BadgeCardProps[]) {
        if (!a.earnedAt && earnedTimes.has(a.id)) a.earnedAt = [earnedTimes.get(a.id)!];
        if (!isPodiumId(a.id) && serials.get(a.id) != null) { a.serial = serials.get(a.id); a.factory = factories.get(a.id); }
    }
    for (const a of achievements as BadgeCardProps[]) a.share = isPodiumId(a.id) || a.id.startsWith('podium-') ? null : holderShare(holderStats, a.id);
    const selected = achievements.find(a => a.id === selectedId) as BadgeCardProps | undefined;

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const progress = (unlockedCount / achievements.length) * 100;

    const [animatedProgress, setAnimatedProgress] = useState(0);

    // Dynamic import for Lottie to avoid SSR issues
    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    const rollToBadge = (rawBadgeId: string) => {
        const podiumMatch = /^podium-(?:\d{4}-\d{2}-)?([123])$/.exec(rawBadgeId);
        const targetId = podiumMatch ? `podium-${podiumMatch[1]}` : rawBadgeId;

        let attempts = 0;
        const tryScroll = () => {
            const el = document.getElementById(`badge-${targetId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedBadgeId(targetId);
                const timer = setTimeout(() => {
                    setHighlightedBadgeId(prev => (prev === targetId ? null : prev));
                }, 7000);
                return () => clearTimeout(timer);
            } else if (attempts < 10) {
                attempts++;
                setTimeout(tryScroll, 150);
            }
        };
        tryScroll();
    };

    // Roll to badge if specified in URL query
    useEffect(() => {
        if (badgeParam) {
            rollToBadge(badgeParam);
        }
    }, [badgeParam]);

    // Roll to badge if triggered by notification click while already on achievements page
    useEffect(() => {
        const handleHighlight = (e: Event) => {
            const ce = e as CustomEvent<{ badgeId: string }>;
            if (ce.detail?.badgeId) {
                rollToBadge(ce.detail.badgeId);
            }
        };
        window.addEventListener('highlight-badge', handleHighlight);
        return () => window.removeEventListener('highlight-badge', handleHighlight);
    }, []);

    if (loading) {
        return <AchievementsSkeleton />;
    }

    return (
        <>
            <div className="ui-compact animate-fade-in">
                {/* Header with Progress */}
                <div className="flex items-center gap-4 mb-6">
                    <Trophy className="w-6 h-6 text-[#E8C15A]" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-xl md:text-2xl font-bold text-[#E8C15A] tracking-wide">MY ACHIEVEMENTS</h1>
                            <span className="text-sm text-[#A0A0A0]">{unlockedCount} / {achievements.length} Unlocked</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-1000 ease-out"
                                style={{ width: `${animatedProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Badges, grouped */}
                <div className="space-y-8">
                    {['Milestones', 'Problems solved', 'Monthly podium', 'Seasons', 'Level 0 sheets', 'Codeforces', 'Streaks', 'Discipline', 'Board'].map(group => {
                        const items = achievements.filter(a => a.group === group);
                        if (items.length === 0) return null;
                        return (
                            <div key={group} className={`relative transition-all overflow-visible ${items.some(a => highlightedBadgeId === a.id) ? 'z-40' : 'z-0'}`}>
                                <div className="flex items-baseline justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-white">{group}</h2>
                                    <span className="text-xs text-white/40 tabular-nums">{items.filter(a => a.unlocked).length}/{items.length}</span>
                                </div>
                                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-1 -m-1 overflow-visible">
                                    {items.map(achievement => (
                                        <BadgeCard
                                            key={achievement.id}
                                            {...achievement}
                                            isHighlighted={highlightedBadgeId === achievement.id}
                                            onOpen={() => setSelectedId(achievement.id)}
                                        />
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
            {selected && <AchievementDetail badge={{ id: selected.id, modelPath: selected.modelPath, title: selected.title, unlocked: selected.unlocked, rarity: selected.rarity, earnedAt: selected.earnedAt, serial: selected.serial, factory: selected.factory, scale: selected.scale }} onClose={() => setSelectedId(null)} />}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}

function BadgeCardSkeleton() {
    return (
        <li className="rounded-xl border border-white/10 bg-[#121214] p-3 flex flex-col items-center text-center justify-between min-h-[190px]">
            <Skeleton className="w-20 h-20 rounded-full my-2" />
            <div className="w-full flex flex-col items-center space-y-1.5 mt-auto">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-3 w-32 rounded mt-1" />
            </div>
        </li>
    );
}

function AchievementsSkeleton() {
    return (
        <div className="ui-compact animate-fade-in" role="status" aria-label="Loading achievements">
            <div className="flex items-center gap-4 mb-6">
                <Trophy className="w-6 h-6 text-[#E8C15A]" />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-6 w-44 rounded-lg" />
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <Skeleton className="w-full h-2.5 rounded-full" />
                </div>
            </div>

            <div className="space-y-8">
                {[1, 2].map(g => (
                    <div key={g} className="space-y-3">
                        <div className="flex items-baseline justify-between mb-3">
                            <Skeleton className="h-4 w-28 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                        </div>
                        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <BadgeCardSkeleton key={i} />
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AchievementsPage() {
    return (
        <Suspense fallback={<AchievementsSkeleton />}>
            <AchievementsContent />
        </Suspense>
    );
}
