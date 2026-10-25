'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Lock } from 'lucide-react';
import dynamic from 'next/dynamic';

const Badge3D = dynamic(() => import('@/components/3d/Badge3D'), { ssr: false });
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENT_META, LEVEL0_SHEET_BADGES, CF_RANK_BADGES, SEASON_BADGES, getAchievementMeta, isPodiumId } from '@/lib/achievements/catalog';

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
}

const RARITY_TEXT = { common: 'text-white/40', rare: 'text-sky-400', legendary: 'text-[#E8C15A]' } as const;

const badgeImage = (id: string) => `/images/achievements/badges/${id}.webp`;

function BadgeCard({ id, modelPath, scale = 2, spin, title, description, unlocked, rarity }: BadgeCardProps) {
    return (
        <li title={description}
            className={`rounded-xl border p-3 flex flex-col items-center text-center ${unlocked ? 'border-white/[0.1] bg-[#121214]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
            <div className="relative w-full h-40 mb-2">
                <Badge3D modelPath={modelPath} scale={scale} spin={spin} unlocked={unlocked} compact fallbackSrc={getAchievementMeta(id)?.imageSrc ?? badgeImage(id)} />
                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock className="w-6 h-6 text-white/60 drop-shadow" /></div>
                )}
            </div>
            <h3 className={`text-sm font-medium leading-tight ${unlocked ? 'text-white' : 'text-white/40'}`}>{title}</h3>
            <p className={`text-[11px] mt-1 leading-snug line-clamp-2 ${unlocked ? 'text-white/45' : 'text-white/25'}`}>{description}</p>
            <span className={`mt-2 text-[10px] capitalize ${unlocked ? RARITY_TEXT[rarity] : 'text-white/20'}`}>{rarity}</span>
        </li>
    );
}

export default function AchievementsPage() {
    const { user, profile: authProfile } = useAuth();
    const profile = (authProfile || {}) as { 
        codeforces_data?: { rating?: string }; 
        is_approval_unlocked?: boolean; 
        sheet_1_solved?: boolean;
        achievements?: { achievement_id: string }[];
    };


    const { achievements: earned } = useAchievements(Boolean(user));
    const earnedIds = new Set(earned.map(a => a.achievement_id));

    const isInstructorUnlocked = user?.role === 'instructor' || user?.role === 'owner';

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
        };
    });

    const achievements = [
        { group: 'Milestones', id: 'welcome', modelPath: '/3d/WELCOME.glb', scale: 2, title: 'Welcome Badge', description: 'Awarded for joining ICPC HUE community', unlocked: true, rarity: 'common' as const },
        { group: 'Board', id: 'instructor', modelPath: '/3d/instructor.glb', scale: 2, title: 'Instructor', description: 'Become an ICPC HUE instructor', unlocked: isInstructorUnlocked, rarity: 'legendary' as const },
        { group: 'Milestones', id: 'rank1-march-2026', modelPath: '/3d/rank1_march.glb', scale: 1.5, title: 'Rank 1 March 2026', description: 'Achieve Rank 1 on the leaderboard during March 2026', unlocked: (profile?.achievements || []).some((a: any) => (a.achievement_id || a) === 'rank1-march-2026'), rarity: 'legendary' as const },
        ...podiumBadges,
        ...SEASON_BADGES.map(season => ({
            group: 'Seasons', id: season.id, modelPath: `/3d/${season.id}.glb`, title: ACHIEVEMENT_META[season.id].name, description: ACHIEVEMENT_META[season.id].desc,
            unlocked: earnedIds.has(season.id), rarity: ACHIEVEMENT_META[season.id].tier,
        })),
        ...CF_RANK_BADGES.map(rank => ({
            group: 'Codeforces', id: rank.id, modelPath: `/3d/${rank.id}.glb`, title: ACHIEVEMENT_META[rank.id].name, description: ACHIEVEMENT_META[rank.id].desc,
            unlocked: earnedIds.has(rank.id), rarity: ACHIEVEMENT_META[rank.id].tier,
        })),
        ...LEVEL0_SHEET_BADGES.map(sheet => ({
            group: 'Level 0 sheets', id: sheet.id, modelPath: `/3d/${sheet.id}.glb`, scale: 2, title: ACHIEVEMENT_META[sheet.id].name, description: ACHIEVEMENT_META[sheet.id].desc,
            unlocked: earnedIds.has(sheet.id), rarity: ACHIEVEMENT_META[sheet.id].tier,
        })),
        { group: 'Board', id: 'mentor', modelPath: '/3d/mentor.glb', scale: 2, title: ACHIEVEMENT_META.mentor.name, description: ACHIEVEMENT_META.mentor.desc, unlocked: earnedIds.has('mentor'), rarity: ACHIEVEMENT_META.mentor.tier },
        ...PROGRESS_BADGES.map(id => ({
            group: id.startsWith('disciplined') ? 'Discipline' : 'Streaks',
            id, modelPath: `/3d/${id}.glb`, title: ACHIEVEMENT_META[id].name, description: ACHIEVEMENT_META[id].desc,
            unlocked: earnedIds.has(id), rarity: ACHIEVEMENT_META[id].tier,
        })),
    ];

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const progress = (unlockedCount / achievements.length) * 100;

    const [animatedProgress, setAnimatedProgress] = useState(0);

    // Dynamic import for Lottie to avoid SSR issues
    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100);
        return () => clearTimeout(timer);
    }, [progress]);

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
                    {['Milestones', 'Monthly podium', 'Seasons', 'Level 0 sheets', 'Codeforces', 'Streaks', 'Discipline', 'Board'].map(group => {
                        const items = achievements.filter(a => a.group === group);
                        if (items.length === 0) return null;
                        return (
                            <section key={group}>
                                <div className="flex items-baseline justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-white">{group}</h2>
                                    <span className="text-xs text-white/40 tabular-nums">{items.filter(a => a.unlocked).length}/{items.length}</span>
                                </div>
                                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {items.map(achievement => (
                                        <BadgeCard key={achievement.id} {...achievement} />
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
