'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Lock } from 'lucide-react';

const Badge3D = dynamic(() => import('@/components/3d/Badge3D'), { ssr: false });

interface BadgeCardProps {
    modelPath?: string;
    imageSrc?: string;
    title: string;
    description: string;
    unlocked: boolean;
    rarity: 'common' | 'rare' | 'legendary';
}

function BadgeCard({ modelPath, imageSrc, title, description, unlocked, rarity }: BadgeCardProps) {
    const rarityStyles = {
        common: 'border-yellow-500/30 bg-yellow-500/10',
        rare: 'border-blue-500/30 bg-blue-500/10',
        legendary: 'border-purple-500/30 bg-purple-500/10',
    };

    return (
        <div className={`relative rounded-3xl border ${unlocked ? rarityStyles[rarity] : 'border-white/5 bg-[#0a0a0a]'} p-6 flex flex-col items-center text-center transition-all ${unlocked ? 'hover:scale-105' : 'opacity-80'}`}>
            {/* Glow effect for unlocked */}
            {unlocked && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(234,179,8,0.15),_transparent_70%)] rounded-3xl pointer-events-none"></div>
            )}

            {/* Badge Model or Image */}
            <div className="relative w-full h-48 md:h-56 mb-8 rounded-2xl overflow-visible">
                {modelPath ? (
                    <div className="w-full h-full">
                        <Badge3D modelPath={modelPath} unlocked={unlocked} scale={2} />
                    </div>
                ) : imageSrc ? (
                    <div className="relative w-24 h-24 mx-auto mt-4">
                        <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            className={`object-cover rounded-2xl ${!unlocked ? 'blur-md grayscale' : ''}`}
                        />
                    </div>
                ) : null}

                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Lock className="w-8 h-8 text-white/50" strokeWidth={2} />
                    </div>
                )}
            </div>

            {/* Title and Description */}
            <h3 className={`text-lg font-bold mb-2 ${unlocked ? 'text-white' : 'text-[#666]'}`}>{title}</h3>
            <p className={`text-xs ${unlocked ? 'text-[#A0A0A0]' : 'text-[#444]'}`}>{description}</p>

            {/* Status Badge */}
            <span className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold ${unlocked ? 'bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20' : 'bg-[#1a1a1a] text-[#666] border border-white/5'}`}>
                {unlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
        </div>
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

    const isInstructorUnlocked = user?.role === 'instructor' || user?.role === 'owner';
    const isSheet1Unlocked = profile?.sheet_1_solved === true;
    const isApprovalUnlocked = profile?.is_approval_unlocked === true;

    const achievements = [
        { id: 'welcome', modelPath: '/3d/WELCOME.glb', title: 'Welcome Badge', description: 'Awarded for joining ICPC HUE community', unlocked: true, rarity: 'common' as const },
        { id: 'approval', modelPath: '/3d/done_approvalcamp.glb', title: 'Level 0', description: 'Complete all sessions of Level 0', unlocked: isApprovalUnlocked, rarity: 'rare' as const },
        { id: 'sheet-1', modelPath: '/3d/sheet1.glb', title: 'Sheet 1 Solved', description: 'Solve all problems in Sheet 1', unlocked: isSheet1Unlocked, rarity: 'rare' as const },
        { id: '500pts', modelPath: '/3d/500pts.glb', title: '500+ Rating', description: 'Achieve 500+ rating on Codeforces', unlocked: is500PtsUnlocked, rarity: 'rare' as const },
        { id: 'instructor', modelPath: '/3d/instructor.glb', title: 'Instructor', description: 'Become an ICPC HUE instructor', unlocked: isInstructorUnlocked, rarity: 'legendary' as const },
        { id: 'rank1-march-2026', modelPath: '/3d/rank1_march.glb', imageSrc: '/images/achievements/rank1_march.webp', title: 'Rank 1 March 2026', description: 'Achieve Rank 1 on the leaderboard during March 2026', unlocked: (profile?.achievements || []).some((a: any) => (a.achievement_id || a) === 'rank1-march-2026'), rarity: 'legendary' as const },
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

            <div className="animate-fade-in">
                {/* Header with Progress */}
                <div className="flex items-center gap-4 mb-6">
                    <Trophy className="w-6 h-6 text-[#E8C15A]" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-xl md:text-2xl font-bold text-[#E8C15A] tracking-wide">MY ACHIEVEMENTS <span className="text-[10px] opacity-30">v1.6.1</span></h1>
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

                {/* Badges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {achievements.map((achievement) => (
                        <BadgeCard key={achievement.id} {...achievement} />
                    ))}
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
