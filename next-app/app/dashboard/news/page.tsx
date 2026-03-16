'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Radio, Calendar, ArrowRight, ThumbsUp, Heart, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

const newsItems = [
    {
        id: 'devlog',
        type: 'DevLog',
        title: 'Development Log',
        date: 'Jan 2, 2026',
        body: 'Explore the complete evolution of ICPC HUE — from genesis to the fully-featured judge system. 11 versions, 35 days of development.',
        image: '/News/devlog.webp',
        featured: true,
        link: '/devlog'
    },
    {
        id: 'pro1-camp',
        type: 'Camp',
        title: 'Programming 1 Camp is Live',
        date: 'Jan 1, 2026',
        body: 'Join our intensive Programming 1 Camp! Sessions are live now. Click here to check out Session 6 resources and recordings.',
        image: '/images/lessons/pro1/pro1camp.webp',
        featured: true, // Assuming big/featured
        link: '/dashboard/sessions/programming1/1'
    },
    {
        id: 'recap-2025',
        type: 'Recap',
        title: 'Your 2025 Wrapped is Here!',
        date: 'Dec 29, 2025',
        body: 'The year is over, but the stats remain! Check out your personal coding journey, total problems solved, and achievements unlocked in 2025.',
        image: '/News/2025recap.webp',
        featured: true,
        link: '/dashboard' // Placeholder, will be dynamic
    },
    {
        id: 'dec-report',
        type: 'Community',
        title: 'December 2025 Report',
        date: 'Dec 28, 2025',
        body: 'See how our community grew in our first month! 300+ students, 160+ live attendees, and 5+ hours of content delivered.',
        image: '/News/decreport.webp',
        featured: true,
        link: '/2025/dec'
    },
    {
        id: 'sheet-1-launch',
        type: 'Training',
        title: 'Sheet 1 Has Arrived!',
        date: 'Dec 24, 2025',
        body: 'Sheet 1 - Say Hello With C++ is now live! Master the basics with 26 new problems. Go solve it now and climb the leaderboard!',
        image: '/images/sheet/sheet1.webp',
        featured: true,
        link: '/dashboard/sheets/sheet-1'
    },
    {
        id: 'welcome-announce',
        type: 'Announcement',
        title: 'Welcome to ICPC HUE!',
        date: 'Jan 2025',
        body: 'Welcome to our training platform! We are excited to have you here. Start with Sheet 1 and join our competitive programming journey.',
        featured: false
    }
];

function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
        case 'training': return 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30';
        case 'announcement': return 'bg-green-500/10 text-green-400 border-green-500/30';
        case 'camp': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        case 'recap': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
        case 'community': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
        case 'devlog': return 'bg-[#d59928]/10 text-[#d59928] border-[#d59928]/30';
        default: return 'bg-white/10 text-white border-white/30';
    }
}

export default function NewsPage() {
    const { profile, user } = useAuth();

    // Get student ID (prefer profile, fallback to email user)
    const studentId = profile?.student_id || user?.email?.split('@')[0];

    // Create dynamic news items
    const dynamicNewsItems = newsItems.map(item => {
        if (item.id === 'recap-2025') {
            return {
                ...item,
                link: studentId ? `/2025/${studentId}` : '/login'
            };
        }
        return item;
    });

    const featuredNewsItems = dynamicNewsItems.filter(n => n.featured);
    const otherNews = dynamicNewsItems.filter(n => !n.featured);

    // Reactions state
    const [reactions, setReactions] = useState<Record<string, { counts: { like: number; heart: number; fire: number }; userReactions: string[] }>>({});

    useEffect(() => {
        const abortController = new AbortController();

        // Fetch reactions for all news items in BATCH (Single Request)
        const fetchAllReactions = async () => {
            try {
                // Collect all IDs
                const ids = newsItems.map(item => item.id).join(',');

                const res = await fetch(`/api/news/reactions?newsIds=${ids}`, {
                    credentials: 'include',
                    signal: abortController.signal
                });

                if (!res.ok) {
                    console.warn('Failed to fetch reactions:', res.status);
                    return;
                }

                const data = await res.json();

                // Validate response structure
                if (data && typeof data === 'object' && !abortController.signal.aborted) {
                    setReactions(data); // The backend now returns the full map { [id]: data }
                }
            } catch (error) {
                // Ignore abort errors
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error('Error fetching reactions:', error);
            }
        };

        fetchAllReactions();

        // Cleanup: abort request on unmount
        return () => {
            abortController.abort();
        };
    }, []);

    const handleReaction = async (newsId: string, reactionType: 'like' | 'heart' | 'fire') => {
        // Optimistic update
        setReactions(prev => {
            const current = prev[newsId] || { counts: { like: 0, heart: 0, fire: 0 }, userReactions: [] };
            const hasReacted = current.userReactions.includes(reactionType);

            return {
                ...prev,
                [newsId]: {
                    counts: {
                        ...current.counts,
                        [reactionType]: hasReacted ? current.counts[reactionType] - 1 : current.counts[reactionType] + 1
                    },
                    userReactions: hasReacted
                        ? current.userReactions.filter(r => r !== reactionType)
                        : [...current.userReactions, reactionType]
                }
            };
        });

        try {
            const res = await fetch('/api/news/reactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newsId, reactionType })
            });

            // If request failed, revert optimistic update
            if (!res.ok) {
                console.error('Failed to toggle reaction:', res.status);
                // Revert optimistic update
                setReactions(prev => {
                    const current = prev[newsId];
                    if (!current) return prev;

                    const hasReacted = !current.userReactions.includes(reactionType);
                    return {
                        ...prev,
                        [newsId]: {
                            counts: {
                                ...current.counts,
                                [reactionType]: hasReacted ? current.counts[reactionType] + 1 : current.counts[reactionType] - 1
                            },
                            userReactions: hasReacted
                                ? [...current.userReactions, reactionType]
                                : current.userReactions.filter(r => r !== reactionType)
                        }
                    };
                });
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);
            // Revert optimistic update on error
            setReactions(prev => {
                const current = prev[newsId];
                if (!current) return prev;

                const hasReacted = !current.userReactions.includes(reactionType);
                return {
                    ...prev,
                    [newsId]: {
                        counts: {
                            ...current.counts,
                            [reactionType]: hasReacted ? current.counts[reactionType] - 1 : current.counts[reactionType] + 1
                        },
                        userReactions: hasReacted
                            ? current.userReactions.filter(r => r !== reactionType)
                            : [...current.userReactions, reactionType]
                    }
                };
            });
        }
    };



    return (
        <>


            <div className="space-y-8 animate-fade-in">
                {/* Page Title */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#E8C15A]/10">
                        <Radio className="text-[#E8C15A]" size={22} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">Team News</h2>
                </div>

                {/* Featured News Cards */}
                <div className="space-y-6">
                    {featuredNewsItems.map((featuredNews) => (
                        <Link key={featuredNews.id} href={featuredNews.link || '#'} className="block group">
                            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#121212] rounded-2xl border border-white/10 overflow-hidden hover:border-[#E8C15A]/40 transition-all duration-300">
                                <div className="grid md:grid-cols-2 gap-0">
                                    {/* Image Side */}
                                    <div className="relative w-full aspect-video md:h-auto overflow-hidden">
                                        <Image
                                            src={featuredNews.image || ''}
                                            alt={featuredNews.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#121212]/80 md:hidden" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent md:hidden" />
                                    </div>

                                    {/* Content Side */}
                                    <div className="p-6 md:p-8 flex flex-col justify-center">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getTypeColor(featuredNews.type)}`}>
                                                {featuredNews.type}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-[#666]">
                                                <Calendar size={12} />
                                                {featuredNews.date}
                                            </span>
                                        </div>

                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-[#E8C15A] transition-colors">
                                            {featuredNews.title}
                                        </h3>

                                        <p className="text-sm md:text-base text-[#888] leading-relaxed mb-6">
                                            {featuredNews.body}
                                        </p>

                                        <div className="flex items-center gap-2 text-[#E8C15A] text-sm font-medium group-hover:gap-3 transition-all">
                                            <span>Read More</span>
                                            <ArrowRight size={16} />
                                        </div>

                                        {/* Reactions */}
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                            {(['like', 'heart', 'fire'] as const).map((type) => {
                                                const Icon = type === 'like' ? ThumbsUp : type === 'heart' ? Heart : Flame;
                                                const count = reactions[featuredNews.id]?.counts[type] || 0;
                                                const isActive = reactions[featuredNews.id]?.userReactions.includes(type) || false;

                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleReaction(featuredNews.id, type);
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${isActive
                                                            ? 'bg-[#E8C15A]/20 text-[#E8C15A] border border-[#E8C15A]/40 scale-105'
                                                            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80 hover:scale-105'
                                                            }`}
                                                    >
                                                        <Icon size={14} className={isActive ? 'fill-current' : ''} />
                                                        {count > 0 && <span>{count}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Other News Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherNews.map((news) => (
                        <div
                            key={news.id}
                            className="bg-[#121212] p-5 rounded-xl border border-white/5 hover:border-[#E8C15A]/30 transition-all group"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${getTypeColor(news.type)}`}>
                                    {news.type}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-[#555]">
                                    <Calendar size={11} />
                                    {news.date}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#E8C15A] transition-colors">
                                {news.title}
                            </h3>
                            <p className="text-sm text-[#777] leading-relaxed mb-4">
                                {news.body}
                            </p>

                            {/* Reactions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                {(['like', 'heart', 'fire'] as const).map((type) => {
                                    const Icon = type === 'like' ? ThumbsUp : type === 'heart' ? Heart : Flame;
                                    const count = reactions[news.id]?.counts[type] || 0;
                                    const isActive = reactions[news.id]?.userReactions.includes(type) || false;

                                    return (
                                        <button
                                            key={type}
                                            onClick={() => handleReaction(news.id, type)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${isActive
                                                ? 'bg-[#E8C15A]/20 text-[#E8C15A] border border-[#E8C15A]/40 scale-105'
                                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80 hover:scale-105'
                                                }`}
                                        >
                                            <Icon size={12} className={isActive ? 'fill-current' : ''} />
                                            {count > 0 && <span>{count}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                } 
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </>
    );
}
