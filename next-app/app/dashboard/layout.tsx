'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { SidebarLogo } from '@/components/dashboard/SidebarLogo';
import {
    LayoutDashboard, ListOrdered, Code, LogOut,
    BookOpen, Bell, Home, Menu, X, Play, Settings, User,
    ChevronRight, ChevronLeft, GraduationCap, Flame, Star, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTracking } from '@/hooks/usePageTracking';
import AutoBackfillTrigger from '@/components/codeforces/AutoBackfillTrigger';
import QuickSyncTrigger from '@/components/codeforces/QuickSyncTrigger';
import CodeBackfillTrigger from '@/components/codeforces/CodeBackfillTrigger';
import { resolveNotificationBadge } from '@/lib/achievements/catalog';

function NavItem({ icon, label, id, active = false, collapsed = false, onClick, className = '', badge }: { icon: React.ReactNode; label: string; id?: string; active?: boolean; collapsed?: boolean; onClick: () => void; className?: string; badge?: React.ReactNode }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (!collapsed) return;
        const timeout = setTimeout(() => setShowTooltip(true), 600); // 600ms delay for "better math" feel
        setHoverTimeout(timeout);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        setShowTooltip(false);
    };

    return (
        <div
            id={id}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`group relative flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 ${active ? 'bg-[#E8C15A]/10 text-[#E8C15A]' : 'text-[#A0A0A0] hover:bg-white/5 hover:text-[#F2F2F2]'} ${collapsed ? 'justify-center' : ''} ${className}`}
        >
            {active && <div className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#E8C15A] ${collapsed ? 'left-1' : ''}`}></div>}
            <span className={`relative ${active ? 'text-[#E8C15A]' : 'transition-colors group-hover:text-[#F2F2F2]'}`}>
                {icon}
                {badge && (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex items-center rounded-[5px] border border-[#E8C15A]/40 bg-[#E8C15A] px-1 py-px text-[7px] font-medium leading-none text-[#0B0B0C]">
                        {badge}
                    </span>
                )}
            </span>

            {!collapsed && <span className="whitespace-nowrap overflow-hidden text-sm font-medium">{label}</span>}

            {/* Tooltip for minimized state */}
            <AnimatePresence>
                {collapsed && showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -5, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-[8px] border border-white/10 bg-[#202327] px-3 py-1.5 text-xs font-medium text-white"
                    >
                        {/* Arrow pointing left */}
                        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-[#171718] border-l border-b border-white/10 rotate-45 transform"></div>
                        <span className="relative z-10">{label}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MobileNavItem({ icon, label, id, active = false, onClick }: { icon: React.ReactNode; label: string; id?: string; active?: boolean; onClick: () => void }) {
    return (
        <button id={id} onClick={onClick} className={`flex w-full flex-col items-center justify-center gap-1.5 py-3.5 transition-colors duration-150 ${active ? 'text-[#E8C15A]' : 'text-[#666]'}`}>
            {icon}
            <span className="text-xs font-medium text-center leading-none px-0.5">{label}</span>
        </button>
    );
}

function formatNotificationTime(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        if (diffSecs < 60) return 'Just now';
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function NotificationsDropdown({
    notifications,
    unreadCount,
    hasSeenUpdate,
    onMarkAllAsRead,
    onNotificationClick,
}: {
    notifications: any[];
    unreadCount: number;
    hasSeenUpdate: boolean;
    onMarkAllAsRead: () => void;
    onNotificationClick: (n: any) => void;
}) {
    const totalUnread = unreadCount + (!hasSeenUpdate ? 1 : 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="notification-dropdown fixed left-4 right-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-84 max-w-sm mx-auto sm:mx-0 bg-[#111113] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white tracking-tight">Notifications</span>
                    {totalUnread > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono">
                            {totalUnread}
                        </span>
                    )}
                </div>
                {(notifications.length > 0 || !hasSeenUpdate) && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="text-[11px] text-white/40 hover:text-white transition-colors"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.05] scrollbar-thin scrollbar-thumb-white/10">
                {/* 3D Achievements System Video Announcement */}
                <div
                    onClick={() => {
                        onNotificationClick({
                            id: 'update-achievements-v3',
                            type: 'announcement',
                            title: '3D Achievements',
                            message: 'Watch the video & explore interactive 3D badges on ICPC HUE',
                        });
                    }}
                    className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                        !hasSeenUpdate
                            ? 'bg-[#E8C15A]/[0.05] hover:bg-[#E8C15A]/[0.1] border-b border-[#E8C15A]/20'
                            : 'hover:bg-white/[0.04]'
                    }`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                        !hasSeenUpdate
                            ? 'bg-[#E8C15A]/20 border border-[#E8C15A]/35 text-[#E8C15A]'
                            : 'bg-white/5 border border-white/10 text-white/60'
                    }`}>
                        <Play size={17} fill="currentColor" className="ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                            <h4 className={`text-xs font-semibold truncate ${
                                !hasSeenUpdate ? 'text-[#E8C15A] group-hover:underline' : 'text-white group-hover:text-[#E8C15A]'
                            }`}>
                                3D Achievements
                            </h4>
                            {!hasSeenUpdate && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 bg-[#E8C15A]/20 text-[#E8C15A] border border-[#E8C15A]/30">
                                    NEW
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed mt-0.5">
                            Watch the video & explore interactive 3D badges
                        </p>
                    </div>
                </div>

                {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-6 h-6 text-white/20 mx-auto mb-2" />
                        <p className="text-xs text-white/40">No other notifications</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const badge = resolveNotificationBadge(n);
                        const isAchievement = n.type === 'achievement' || Boolean(badge);
                        const badgeImageSrc = badge?.meta.imageSrc || (n.achievement_id ? `/images/achievements/badges/${n.achievement_id}.webp` : null);

                        return (
                            <div
                                key={n.id}
                                onClick={() => onNotificationClick(n)}
                                className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                                    !n.is_read ? 'bg-white/[0.02]' : ''
                                } hover:bg-white/[0.04]`}
                            >
                                {/* Badge 3D photo or clean icon */}
                                {isAchievement && badgeImageSrc ? (
                                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                                        <Image
                                            src={badgeImageSrc}
                                            alt={badge?.meta.name || n.title}
                                            width={44}
                                            height={44}
                                            className="w-full h-full object-contain transition-transform duration-200"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 text-white/60">
                                        {n.type === 'leaderboard' ? <ListOrdered size={16} /> : <Bell size={16} />}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h4 className="text-xs font-semibold text-white group-hover:text-[#E8C15A] transition-colors truncate">
                                            {badge?.meta.name || n.title}
                                        </h4>
                                        <span className="text-[10px] text-white/40 shrink-0 tabular-nums font-mono">
                                            {formatNotificationTime(n.created_at)}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed mt-0.5">
                                        {badge?.meta.desc || n.message}
                                    </p>

                                    {(!n.is_read || (isAchievement && badge?.meta.tier)) && (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            {isAchievement && badge?.meta.tier && (
                                                <span className="text-[9px] font-mono text-white/30">
                                                    {badge.meta.tier}
                                                </span>
                                            )}
                                            {!n.is_read && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C15A]" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, isAuthenticated, logout } = useAuth();
    const router = useRouter();

    // Track page navigation across all dashboard pages
    // Telemetry is only enabled after the Supabase session has been resolved.
    // This avoids firing protected tracking requests during the initial auth
    // loading state (or after an auth failure), which otherwise creates noisy
    // 401s and can capture third-party extension errors on the login page.
    usePageTracking(isAuthenticated && !loading);
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [hasSeenUpdate, setHasSeenUpdate] = useState(() => {
        if (typeof window === 'undefined') return true;
        try {
            return Boolean(localStorage.getItem('seen_achievements_v3_update'));
        } catch {
            return true;
        }
    });

    useEffect(() => {
        const handleSeen = () => setHasSeenUpdate(true);
        window.addEventListener('achievements-update-seen', handleSeen);
        return () => window.removeEventListener('achievements-update-seen', handleSeen);
    }, []);

    const totalUnreadCount = unreadCount + (!hasSeenUpdate ? 1 : 0);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [transitionsEnabled, setTransitionsEnabled] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [starCount, setStarCount] = useState<number | null>(null);

    // Fetch GitHub stars count
    useEffect(() => {
        fetch('/api/github/stars')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && typeof data.stars === 'number') {
                    setStarCount(data.stars);
                }
            })
            .catch(() => {});
    }, []);

    // This is intentionally client-triggered: serverless functions may be
    // terminated as soon as /api/auth/me responds, so background work belongs
    // to the authenticated browser lifecycle.

    // Initial check and resize listener for mobile state
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Restore the saved sidebar state before the first paint, so a collapsed
    // sidebar does not render open and then animate shut on every refresh.
    useLayoutEffect(() => {
        try {
            const saved = localStorage.getItem('sidebarCollapsed');
            if (saved !== null) setIsSidebarCollapsed(saved === 'true');
        } catch (error) {
            console.warn('Failed to load sidebar state from localStorage:', error);
        }
    }, []);

    // Animate only user toggles: enable transitions two frames after the
    // restored width has been painted.
    useEffect(() => {
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setTransitionsEnabled(true));
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, []);

    const toggleSidebar = (collapsed: boolean) => {
        setIsSidebarCollapsed(collapsed);

        // SSR-safe localStorage access with error handling
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('sidebarCollapsed', String(collapsed));
            } catch (error) {
                console.warn('Failed to save sidebar state to localStorage:', error);
            }
            // Fire-and-forget DB save
            fetch('/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ prefs: { sidebarCollapsed: String(collapsed) } }),
            }).catch(() => {});
        }
    };

    const fetchNotifications = async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.notifications.filter((n: any) => !n.is_read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        let lastNotifFetch = Date.now();
        const safeFetchNotifications = () => {
            lastNotifFetch = Date.now();
            fetchNotifications();
        };

        safeFetchNotifications();

        // Poll every 5m, but only when tab is visible (saves serverless invocations)
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) return;
            interval = setInterval(safeFetchNotifications, 300000);
        };
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null; }
        };

        const handleVisibility = () => {
            if (document.hidden) stopPolling();
            else {
                if (Date.now() - lastNotifFetch > 60000) safeFetchNotifications();
                startPolling();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isAuthenticated]);

    const markAllAsRead = async () => {
        try {
            localStorage.setItem('seen_achievements_v3_update', 'true');
            setHasSeenUpdate(true);
            const res = await fetch('/api/notifications', { method: 'PATCH' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const res = await fetch(`/api/notifications?id=${id}`, { method: 'PATCH' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleNotificationClick = (n: any) => {
        setShowNotifications(false);

        if (n.id === 'update-achievements-v3') {
            try {
                localStorage.setItem('seen_achievements_v3_update', 'true');
                setHasSeenUpdate(true);
            } catch {}
            window.dispatchEvent(new CustomEvent('open-achievements-update-log'));
            return;
        }

        markAsRead(n.id);

        const badge = resolveNotificationBadge(n);
        const targetBadgeId = n.achievement_id || badge?.id;
        const targetLink = n.link || (targetBadgeId ? `/dashboard/achievements?badge=${targetBadgeId}` : null);

        if (targetLink) {
            if (pathname === '/dashboard/achievements' && targetBadgeId) {
                window.dispatchEvent(new CustomEvent('highlight-badge', { detail: { badgeId: targetBadgeId } }));
                router.push(targetLink);
            } else {
                router.push(targetLink);
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showNotifications && !target.closest('.notification-dropdown') && !target.closest('.notification-trigger')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    const getActivePage = () => {
        if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard';
        if (pathname === '/dashboard/profile') return 'My Profile';
        if (pathname === '/dashboard/sessions' || pathname.startsWith('/dashboard/sessions/')) return 'Sessions';
        if (pathname === '/dashboard/sheets' || pathname.startsWith('/dashboard/sheets/')) return 'Training Sheets';
        if (pathname === '/dashboard/leaderboard') return 'Leaderboard';
        if (pathname === '/dashboard/achievements') return 'Achievements';
        if (pathname === '/dashboard/news') return 'Team News';
        if (pathname === '/dashboard/discipline') return 'Self Discipline';
        if (pathname === '/dashboard/mentor' || pathname.startsWith('/dashboard/mentor/')) return 'Mentor Panel';
        if (pathname === '/dashboard/settings') return 'Settings';
        return 'Dashboard';
    };

    const isMentor = user?.role === 'owner' || user?.role === 'instructor' || user?.role === 'mentor';

    const activePage = getActivePage();

    const segments = pathname.split('/').filter(Boolean);
    const isProblemPage = segments[0] === 'dashboard' && segments[1] === 'sheets' && segments.length === 5;

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Remember last visited sub-route for complex nested sections (Sheets, Sessions, Mentor)
    // so navigating away (e.g. to Leaderboard or Profile) and clicking back returns
    // the student or mentor directly to their working subroute in 1 click instead of 3.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (pathname.startsWith('/dashboard/sheets/') && pathname !== '/dashboard/sheets') {
            try {
                sessionStorage.setItem('last_sheets_path', pathname);
            } catch {}
        }
        if (pathname.startsWith('/dashboard/sessions/') && pathname !== '/dashboard/sessions') {
            try {
                sessionStorage.setItem('last_sessions_path', pathname);
            } catch {}
        }
        if (pathname.startsWith('/dashboard/mentor/') && pathname !== '/dashboard/mentor') {
            try {
                sessionStorage.setItem('last_mentor_path', pathname);
            } catch {}
        }
    }, [pathname]);

    const handleBack = () => {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length <= 1) {
            router.push('/dashboard');
            return;
        }
        const parentPath = '/' + segments.slice(0, -1).join('/');
        router.push(parentPath);
    };

    const handleNav = (path: string) => {
        setMobileMenuOpen(false);

        if (path === '/dashboard/sheets') {
            // If already inside sheets subroute, clicking Training Sheets toggles back to the root sheets list
            if (pathname.startsWith('/dashboard/sheets') && pathname !== '/dashboard/sheets') {
                router.push('/dashboard/sheets');
                return;
            }
            // If coming from another section (e.g. Leaderboard, Profile, Dashboard), restore active sheet
            const saved = typeof window !== 'undefined' ? sessionStorage.getItem('last_sheets_path') : null;
            if (saved && saved !== pathname) {
                router.push(saved);
                return;
            }
            router.push('/dashboard/sheets');
            return;
        }

        if (path === '/dashboard/sessions') {
            if (pathname.startsWith('/dashboard/sessions') && pathname !== '/dashboard/sessions') {
                router.push('/dashboard/sessions');
                return;
            }
            const saved = typeof window !== 'undefined' ? sessionStorage.getItem('last_sessions_path') : null;
            if (saved && saved !== pathname) {
                router.push(saved);
                return;
            }
            router.push('/dashboard/sessions');
            return;
        }

        if (path === '/dashboard/mentor') {
            if (pathname.startsWith('/dashboard/mentor') && pathname !== '/dashboard/mentor') {
                router.push('/dashboard/mentor');
                return;
            }
            const saved = typeof window !== 'undefined' ? sessionStorage.getItem('last_mentor_path') : null;
            if (saved && saved !== pathname) {
                router.push(saved);
                return;
            }
            router.push('/dashboard/mentor');
            return;
        }

        router.push(path);
    };

    // Only a first visit (no remembered login) waits here; returning students
    // render straight away while the session is checked in the background.
    if (loading) return (
        <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center" role="status" aria-label="Loading">
            <Image src="/icpchue-logo.webp" alt="" width={56} height={56} priority className="animate-pulse opacity-80" />
        </div>
    );
    return (
        <div dir="ltr" className="relative min-h-screen bg-[#0B0B0C] text-[#DCDCDC] font-sans selection:bg-[#CFA144] selection:text-[#121212] w-full max-w-[100vw]">
            <AutoBackfillTrigger />
            <QuickSyncTrigger />
            <CodeBackfillTrigger />

            {/* Mobile Header (hidden on problem page) */}
            {!isProblemPage && (
                <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0B0B0C] border-b border-white/10 px-4 py-2 flex items-center justify-between h-14">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-6 h-6 flex items-center justify-center">
                            <Image
                                src="/icons/icpchue.svg"
                                alt="ICPC HUE Logo"
                                width={32}
                                height={32}
                                className="w-8 h-8"
                            />
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                aria-label="Notifications"
                                className={`notification-trigger min-w-[38px] min-h-[38px] p-2 flex items-center justify-center rounded-lg transition-[color,background-color,border-color,opacity,transform] ${showNotifications ? 'bg-[#E8C15A]/20 text-[#E8C15A]' : 'text-[#A0A0A0] hover:text-[#E8C15A] hover:bg-white/5'}`}
                            >
                                <Bell size={20} />
                                {totalUnreadCount > 0 && (
                                    <div className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-600 rounded-full border border-[#0B0B0C] flex items-center justify-center text-[8px] font-semibold text-white">
                                        {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                    </div>
                                )}
                            </button>
                            <AnimatePresence>
                                {showNotifications && (
                                    <NotificationsDropdown
                                        notifications={notifications}
                                        unreadCount={unreadCount}
                                        hasSeenUpdate={hasSeenUpdate}
                                        onMarkAllAsRead={markAllAsRead}
                                        onNotificationClick={handleNotificationClick}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            className="min-w-[40px] min-h-[40px] p-2 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        >
                            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation (hidden on problem page) */}
            {!isProblemPage && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0C] border-t border-white/10 pb-[env(safe-area-inset-bottom)] grid grid-cols-5 w-full items-end">
                    <MobileNavItem id="mobile-nav-dashboard" icon={<LayoutDashboard size={22} />} label="Home" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                    <MobileNavItem id="mobile-nav-profile" icon={<Code size={22} />} label="Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                    <MobileNavItem id="mobile-nav-sessions" icon={<Play size={22} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                    <MobileNavItem id="mobile-nav-sheets" icon={<BookOpen size={22} />} label="Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                    <MobileNavItem id="mobile-nav-leaderboard" icon={<ListOrdered size={22} />} label="Rank" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                </nav>
            )}

            {/* Mobile Menu Overlay (hidden on problem page) */}
            <AnimatePresence>
                {
                    mobileMenuOpen && !isProblemPage && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="md:hidden fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
                                onClick={() => setMobileMenuOpen(false)}
                            />

                            {/* Side Drawer */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                drag="x"
                                dragConstraints={{ left: 0 }}
                                dragElastic={{ left: 0, right: 0.2 }}
                                onDragEnd={(e, { offset, velocity }) => {
                                    if (offset.x > 100 || velocity.x > 100) {
                                        setMobileMenuOpen(false);
                                    }
                                }}
                                className="md:hidden fixed bottom-0 right-0 top-0 z-[9999] flex w-72 touch-pan-y flex-col border-l border-white/10 bg-[#111214]"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-white/10 p-5">
                                    <span className="text-xl font-medium text-[#F2F2F2]">Menu</span>
                                    <button
                                        onClick={() => setMobileMenuOpen(false)}
                                        aria-label="Close menu"
                                        className="rounded-[8px] p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                                    >
                                        <X size={32} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col justify-between">
                                    <nav className="flex flex-col gap-4 sm:gap-5 pt-2">
                                        <NavItem
                                            icon={<Home size={26} />}
                                            label="Home"
                                            active={pathname === '/'}
                                            onClick={() => { router.push('/'); setMobileMenuOpen(false); }}
                                            className="text-base font-medium"
                                        />
                                        <NavItem
                                            icon={<Award size={26} />}
                                            label="Achievements"
                                            active={activePage === 'Achievements'}
                                            onClick={() => handleNav('/dashboard/achievements')}
                                            className="text-base font-medium"
                                        />
                                        <NavItem
                                            icon={<Flame size={26} />}
                                            label="Self Discipline"
                                            active={activePage === 'Self Discipline'}
                                            onClick={() => handleNav('/dashboard/discipline')}
                                            className="text-base font-medium"
                                           
                                        />
                                        <NavItem
                                            icon={<Settings size={26} />}
                                            label="Settings"
                                            active={activePage === 'Settings'}
                                            onClick={() => handleNav('/dashboard/settings')}
                                            className="text-base font-medium"
                                        />
                                        {isMentor && (
                                            <NavItem
                                                icon={<GraduationCap size={26} />}
                                                label="Mentor Panel"
                                                active={activePage === 'Mentor Panel'}
                                                onClick={() => handleNav('/dashboard/mentor')}
                                                className="text-base font-medium"
                                            />
                                        )}
                                    </nav>

                                    <div className="pt-6 mt-auto">
                                        <a
                                            href="https://github.com/YUST777/icpchue"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-[#E8C15A]/10 hover:border-[#E8C15A]/30 transition-[color,background-color,border-color,opacity,transform] active:scale-[0.98]"
                                        >
                                            <span className="text-sm font-semibold text-white/90">Support us</span>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-white/10 text-[#E8C15A] border border-[#E8C15A]/20">
                                                <Star size={13} className="text-[#E8C15A] fill-[#E8C15A]" />
                                                <span>{starCount !== null ? starCount : ''}</span>
                                            </span>
                                        </a>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-white/10">
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                            {user?.profile_picture ? (
                                                <Image
                                                    src={user.profile_picture.startsWith('http') || user.profile_picture.startsWith('/')
                                                        ? user.profile_picture
                                                        : `/pfps/${user.profile_picture}`}
                                                    alt={user.email || 'User'}
                                                    width={32}
                                                    height={32}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <User size={16} className="text-[#E8C15A]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">{getDisplayName(profile?.name || user?.email)}</p>
                                            <p className="text-[10px] text-[#666] truncate">{user?.email}</p>
                                        </div>
                                        <button
                                            onClick={() => { logout(); router.push('/'); }}
                                            className="p-2 text-[#A0A0A0] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-[color,background-color,border-color,opacity,transform]"
                                            title="Sign Out"
                                        >
                                            <LogOut size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >

            {/* Desktop Sidebar (hidden on problem page) */}
            {!isProblemPage && (
                < motion.aside
                    initial={false}
                    animate={{ width: isSidebarCollapsed ? 80 : 256 }}
                    transition={transitionsEnabled ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                    className={`fixed z-50 hidden h-full shrink-0 flex-col border-r border-white/10 bg-[#0f1012] md:flex scrollbar-hide ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}
                >
                    <div className="flex-1">
                        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                            <SidebarLogo isCollapsed={isSidebarCollapsed} />
                            {!isSidebarCollapsed && (
                                <button onClick={() => toggleSidebar(true)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <ChevronLeft size={20} strokeWidth={2} />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col items-center w-full">
                            {isSidebarCollapsed && (
                                <button onClick={() => toggleSidebar(false)} className="mb-4 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <ChevronRight size={24} strokeWidth={2} />
                                </button>
                            )}
                        </div>

                        {!isSidebarCollapsed && <div className="px-4 py-2 text-xs font-medium text-[#85868a]">Training</div>}
                        <nav className="mt-2 space-y-1 px-2">
                            <NavItem id="onboarding-nav-dashboard" collapsed={isSidebarCollapsed} icon={<LayoutDashboard size={20} />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                            <NavItem id="onboarding-nav-profile" collapsed={isSidebarCollapsed} icon={<Code size={20} />} label="My Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                            <NavItem id="onboarding-nav-sessions" collapsed={isSidebarCollapsed} icon={<Play size={20} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                            <NavItem id="onboarding-nav-sheets" collapsed={isSidebarCollapsed} icon={<BookOpen size={20} />} label="Training Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                            <NavItem id="onboarding-nav-leaderboard" collapsed={isSidebarCollapsed} icon={<ListOrdered size={20} />} label="Leaderboard" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                            <NavItem id="onboarding-nav-discipline" collapsed={isSidebarCollapsed} icon={<Flame size={20} />} label="Self Discipline" active={activePage === 'Self Discipline'} onClick={() => handleNav('/dashboard/discipline')} />
                            {isMentor && (
                                <NavItem id="onboarding-nav-mentor" collapsed={isSidebarCollapsed} icon={<GraduationCap size={20} />} label="Mentor Panel" active={activePage === 'Mentor Panel'} onClick={() => handleNav('/dashboard/mentor')} />
                            )}
                        </nav>
                    </div>

                    <div className="p-2 border-t border-white/5 mt-auto">
                        <Link href="/" className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden shrink-0">
                                {user?.profile_picture ? (
                                    <Image
                                        src={user.profile_picture.startsWith('http') || user.profile_picture.startsWith('/')
                                            ? user.profile_picture
                                            : `/pfps/${user.profile_picture}`}
                                        alt={user.email || 'User'}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <User size={16} className="text-[#E8C15A]" />
                                )}
                            </div>
                            {!isSidebarCollapsed && (
                                <>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-semibold text-white truncate">{getDisplayName(profile?.name || user?.email)}</p>
                                        <p className="text-[10px] text-[#666] truncate group-hover:text-[#E8C15A] transition-colors">Back to Home</p>
                                    </div>
                                    <Home size={14} className="text-[#666] group-hover:text-white transition-colors" />
                                </>
                            )}
                        </Link>
                    </div>

                </motion.aside >
            )}

            {/* Main Content */}
            < motion.main
                initial={false}
                animate={{ marginLeft: isMobile || isProblemPage ? 0 : (isSidebarCollapsed ? 80 : 256) }}
                transition={transitionsEnabled ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                className={`${isProblemPage ? 'pt-0 pb-0' : 'pt-14 md:pt-0 pb-24 md:pb-0'} max-md:!ml-0 max-md:!w-full max-w-[100vw]`}
            >
                {!isProblemPage && (
                    <header className="sticky top-0 z-40 w-full h-16 bg-[#0B0B0C] flex items-center justify-between px-4 md:px-8 hidden md:flex border-b border-white/[0.04]">
                        {/* Dynamic Breadcrumbs Layout */}
                        <nav aria-label="Breadcrumbs" className="dashboard-breadcrumbs flex min-w-0 flex-nowrap items-center gap-2 py-1 text-xs font-medium text-[#85868a]">
                            <button
                                type="button"
                                onClick={handleBack}
                                aria-label="Go back"
                                className="hover:text-white transition-colors mr-1 shrink-0 p-1 rounded-md hover:bg-white/5 flex items-center justify-center leading-none"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {(() => {
                                const pathSegments = pathname.split('/').filter(Boolean);
                                return pathSegments.map((segment, index) => {
                                    const href = '/' + pathSegments.slice(0, index + 1).join('/');

                                    // Map segments to readable labels
                                    let label = segment;

                                    if (segment === 'dashboard') label = 'Dashboard';
                                    else if (segment === 'sheets') label = 'Sheets';
                                    else if (segment === 'roadmap') label = 'Roadmap';
                                    else if (segment === 'profile') label = 'Profile';
                                    else if (segment === 'leaderboard') label = 'Leaderboard';
                                    else if (segment === 'sessions') label = 'Sessions';
                                    else if (segment === 'news') label = 'News';
                                    else if (segment === 'admin') label = 'Admin';
                                    else if (segment === 'discipline') label = 'Self discipline';
                                    else if (segment.startsWith('level-')) label = `Level ${segment.replace('level-', '')}`;
                                    else if (segment.startsWith('level')) label = `Level ${segment.replace('level', '')}`;
                                    else if (segment.startsWith('sheet-')) label = `Sheet ${segment.replace('sheet-', '').toUpperCase()}`;
                                    else if (segment.startsWith('week-')) label = `Week ${segment.replace('week-', '')}`;
                                    else if (segment.length > 24) label = '...';
                                    else label = segment.replace(/-/g, ' ');

                                    const isLast = index === pathSegments.length - 1;

                                    return (
                                        <div key={href} className="flex items-center gap-2 shrink-0 flex-nowrap whitespace-nowrap">
                                            {index > 0 && <ChevronRight size={14} className="text-[#444] shrink-0" />}
                                            {isLast ? (
                                                <span className="text-[#F2F2F2] font-semibold shrink-0 cursor-default">
                                                    {label}
                                                </span>
                                            ) : (
                                                <Link
                                                    href={href}
                                                    className="shrink-0 text-[#85868a] no-underline transition-colors hover:text-[#E8C15A]"
                                                >
                                                    {label}
                                                </Link>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </nav>

                        <div className="flex items-center gap-2">
                            <a href="https://github.com/YUST777/icpchue" target="_blank" rel="noopener noreferrer" title="Support ICPC HUE on GitHub" aria-label="Support ICPC HUE on GitHub" className="group inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-xs font-medium text-white/90 hover:bg-[#E8C15A]/10 hover:border-[#E8C15A]/30 transition-[color,background-color,border-color,opacity,transform] active:scale-95">
                                <span className="hidden sm:inline">Support us</span>
                                {starCount !== null ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white/70 pl-1.5 border-l border-white/15 ml-0.5">
                                        <Star size={12} className="text-[#E8C15A] fill-[#E8C15A] transition-transform" />
                                        <span>{starCount}</span>
                                    </span>
                                ) : (
                                    <Star size={12} className="text-[#E8C15A] fill-[#E8C15A] transition-transform ml-0.5" />
                                )}
                            </a>
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`notification-trigger w-8 h-8 flex items-center justify-center rounded-lg transition-[color,background-color,border-color,opacity,transform] ${showNotifications ? 'bg-[#E8C15A]/20 text-white/60' : 'text-[#A0A0A0] hover:text-white/60 hover:bg-white/5'}`}
                                >
                                    <Bell size={18} />
                                    {totalUnreadCount > 0 && (
                                        <div className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-600 rounded-full border border-[#0B0B0C] flex items-center justify-center text-[8px] font-semibold text-white">
                                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                        </div>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <NotificationsDropdown
                                            notifications={notifications}
                                            unreadCount={unreadCount}
                                            hasSeenUpdate={hasSeenUpdate}
                                            onMarkAllAsRead={markAllAsRead}
                                            onNotificationClick={handleNotificationClick}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                            <Link href="/dashboard/settings" className="w-8 h-8 flex items-center justify-center text-[#A0A0A0] hover:text-[#E8C15A] hover:bg-white/5 rounded-lg transition-[color,background-color,border-color,opacity,transform]">
                                <Settings size={18} />
                            </Link>
                            <button onClick={() => { logout(); router.push('/'); }} className="w-8 h-8 flex items-center justify-center text-[#A0A0A0] hover:text-red-500 hover:bg-white/5 rounded-lg transition-[color,background-color,border-color,opacity,transform]">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </header>
                )}

                <div className="px-4 py-2 md:p-8 max-w-none md:max-w-6xl mx-auto">
                    {children}
                </div>
            </motion.main>



        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayoutContent>
            {children}
        </DashboardLayoutContent>
    );
}
