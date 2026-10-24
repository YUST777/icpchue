'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Lock } from 'lucide-react';
import { BadgeStage, BadgeTile } from '@/components/achievements/BadgeStage';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENT_META } from '@/lib/achievements/catalog';

const PROGRESS_BADGES = ['hello-world', 'streak-3', 'streak-7', 'streak-14', 'streak-30', 'streak-60', 'comeback', 'disciplined-7', 'disciplined-program', 'mentor'];

interface BadgeCardProps {
    group?: string;
    id: string;
    modelPath: string;
    spin?: boolean;
    title: string;
    description: string;
    unlocked: boolean;
    rarity: 'common' | 'rare' | 'legendary';
}

const RARITY_TEXT = { common: 'text-white/40', rare: 'text-sky-400', legendary: 'text-[#E8C15A]' } as const;

const badgeImage = (id: string) => `/images/achievements/badges/${id}.webp`;

function BadgeCard({ id, modelPath, spin, title, description, unlocked, rarity }: BadgeCardProps) {
    return (
        <li title={description}
            className={`rounded-xl border p-3 flex flex-col items-center text-center ${unlocked ? 'border-white/[0.1] bg-[#121214]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
            <div className="relative w-full h-28 mb-2">
                <BadgeTile modelPath={modelPath} imageSrc={badgeImage(id)} spin={spin} live={unlocked} />
                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock className="w-5 h-5 text-white/50" /></div>
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

    // Check unlock conditions
    const codeforcesData = profile?.codeforces_data;
    const codeforcesRating = codeforcesData?.rating ? parseInt(codeforcesData.rating, 10) : null;
    const is500PtsUnlocked = codeforcesRating !== null && codeforcesRating >= 500;

    const { achievements: earned } = useAchievements(Boolean(user));
    const earnedIds = new Set(earned.map(a => a.achievement_id));

    const isInstructorUnlocked = user?.role === 'instructor' || user?.role === 'owner';
    const isSheet1Unlocked = profile?.sheet_1_solved === true;
    const isApprovalUnlocked = profile?.is_approval_unlocked === true;

    const achievements = [
        { group: 'Milestones', id: 'welcome', modelPath: '/3d/WELCOME.glb', title: 'Welcome Badge', description: 'Awarded for joining ICPC HUE community', unlocked: true, rarity: 'common' as const },
        { group: 'Milestones', id: 'approval', modelPath: '/3d/done_approvalcamp.glb', title: 'Level 0', description: 'Complete all sessions of Level 0', unlocked: isApprovalUnlocked, rarity: 'rare' as const },
        { group: 'Milestones', id: 'sheet-1', modelPath: '/3d/sheet1.glb', title: 'Sheet 1 Solved', description: 'Solve all problems in Sheet 1', unlocked: isSheet1Unlocked, rarity: 'rare' as const },
        { group: 'Milestones', id: '500pts', modelPath: '/3d/500pts.glb', title: '500+ Rating', description: 'Achieve 500+ rating on Codeforces', unlocked: is500PtsUnlocked, rarity: 'rare' as const },
        { group: 'Milestones', id: 'instructor', modelPath: '/3d/instructor.glb', title: 'Instructor', description: 'Become an ICPC HUE instructor', unlocked: isInstructorUnlocked, rarity: 'legendary' as const },
        { group: 'Milestones', id: 'rank1-march-2026', modelPath: '/3d/rank1_march.glb', title: 'Rank 1 March 2026', description: 'Achieve Rank 1 on the leaderboard during March 2026', unlocked: (profile?.achievements || []).some((a: any) => (a.achievement_id || a) === 'rank1-march-2026'), rarity: 'legendary' as const },
        ...PROGRESS_BADGES.map(id => ({
            group: id.startsWith('disciplined') || id === 'mentor' ? 'Discipline & mentoring' : 'Streaks',
            id, modelPath: `/3d/${id}.glb`, spin: true, title: ACHIEVEMENT_META[id].name, description: ACHIEVEMENT_META[id].desc,
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

            <BadgeStage className="ui-compact animate-fade-in">
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
                    {['Milestones', 'Streaks', 'Discipline & mentoring'].map(group => {
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
            </BadgeStage>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
