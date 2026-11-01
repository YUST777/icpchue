'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowRight, ThumbsUp, Heart, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';

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
        case 'training':
        case 'devlog': return 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/20';
        default: return 'bg-white/[0.04] text-white/70 border-white/10';
    }
}

export default function NewsPage() {
    const dynamicNewsItems = newsItems;

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


            <div className="space-y-6 sm:space-y-8">
                {/* Page Title */}
                <PageHeader title="Team news" subtitle="Updates, devlogs and announcements from the team." />

                {/* Featured News Cards */}
                <div className="space-y-4">
                    {featuredNewsItems.map((featuredNews) => (
                            <article key={featuredNews.id} className="ui-card group grid overflow-hidden transition-colors duration-150 hover:border-white/20 md:grid-cols-2">
                                    {/* Image Side */}
                                    <Link href={featuredNews.link || '#'} aria-label={featuredNews.title} className="relative block aspect-video overflow-hidden bg-black/20 md:aspect-auto md:min-h-64">
                                        <Image
                                            src={featuredNews.image || ''}
                                            alt={featuredNews.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover transition-transform duration-300"
                                        />
                                    </Link>

                                    {/* Content Side */}
                                    <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6">
                                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <span className={`inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-medium ${getTypeColor(featuredNews.type)}`}>
                                                {featuredNews.type}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                                                <Calendar size={13} aria-hidden="true" />
                                                {featuredNews.date}
                                            </span>
                                        </div>

                                        <h3 className="mb-2 text-xl font-medium leading-snug text-[var(--color-text)] transition-colors group-hover:text-[#E8C15A] sm:text-2xl">
                                            <Link href={featuredNews.link || '#'}>{featuredNews.title}</Link>
                                        </h3>

                                        <p className="mb-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                                            {featuredNews.body}
                                        </p>

                                        <Link href={featuredNews.link || '#'} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-[#E8C15A] transition-colors hover:text-[#F0CE76]">
                                            <span>Read more</span>
                                            <ArrowRight size={16} aria-hidden="true" />
                                        </Link>

                                        {/* Reactions */}
                                        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                                            {(['like', 'heart', 'fire'] as const).map((type) => {
                                                const Icon = type === 'like' ? ThumbsUp : type === 'heart' ? Heart : Flame;
                                                const count = reactions[featuredNews.id]?.counts[type] || 0;
                                                const isActive = reactions[featuredNews.id]?.userReactions.includes(type) || false;

                                                return (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        aria-label={`${type} ${featuredNews.title}`}
                                                        aria-pressed={isActive}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReaction(featuredNews.id, type);
                                                        }}
                                                        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${isActive
                                                            ? 'border-[#E8C15A]/30 bg-[#E8C15A]/10 text-[#E8C15A]'
                                                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white'
                                                            }`}
                                                    >
                                                        <Icon size={14} className={isActive ? 'fill-current' : ''} aria-hidden="true" />
                                                        {count > 0 && <span>{count}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                            </article>
                    ))}
                </div>

                {/* Other News Grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {otherNews.map((news) => (
                        <article
                            key={news.id}
                            className="ui-card group flex min-w-0 flex-col p-4 transition-colors duration-150 hover:border-white/20 sm:p-5"
                        >
                            {/* Header */}
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className={`inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-medium ${getTypeColor(news.type)}`}>
                                    {news.type}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                                    <Calendar size={13} aria-hidden="true" />
                                    {news.date}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="mb-2 text-lg font-medium leading-snug text-[var(--color-text)] transition-colors group-hover:text-[#E8C15A]">
                                {news.title}
                            </h3>
                            <p className="mb-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                                {news.body}
                            </p>

                            {/* Reactions */}
                            <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                                {(['like', 'heart', 'fire'] as const).map((type) => {
                                    const Icon = type === 'like' ? ThumbsUp : type === 'heart' ? Heart : Flame;
                                    const count = reactions[news.id]?.counts[type] || 0;
                                    const isActive = reactions[news.id]?.userReactions.includes(type) || false;

                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            aria-label={`${type} ${news.title}`}
                                            aria-pressed={isActive}
                                            onClick={() => handleReaction(news.id, type)}
                                            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${isActive
                                                ? 'border-[#E8C15A]/30 bg-[#E8C15A]/10 text-[#E8C15A]'
                                                : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white'
                                                }`}
                                        >
                                            <Icon size={14} className={isActive ? 'fill-current' : ''} aria-hidden="true" />
                                            {count > 0 && <span>{count}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </>
    );
}
