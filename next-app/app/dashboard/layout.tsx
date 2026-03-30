'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { SidebarLogo } from '@/components/dashboard/SidebarLogo';
import {
    LayoutDashboard, Trophy, Code, LogOut,
    BookOpen, Bell, Home, Menu, X, Play, Settings, User,
    ChevronRight, ChevronLeft, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestCasesLoader } from '@/components/common/TestCasesLoader';

function NavItem({ icon, label, id, active = false, collapsed = false, onClick, className = '' }: { icon: React.ReactNode; label: string; id?: string; active?: boolean; collapsed?: boolean; onClick: () => void; className?: string }) {
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
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative ${active ? 'bg-gradient-to-r from-[#E8C15A]/20 to-transparent text-[#E8C15A]' : 'text-[#A0A0A0] hover:text-[#F2F2F2] hover:bg-white/5'} ${collapsed ? 'justify-center' : ''} ${className}`}
        >
            {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E8C15A] rounded-r-full shadow-[0_0_10px_#E8C15A] ${collapsed ? 'left-1' : ''}`}></div>}
            <span className={active ? 'text-[#E8C15A]' : 'group-hover:text-[#F2F2F2] transition-colors'}>{icon}</span>

            {!collapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}

            {/* Tooltip for minimized state */}
            <AnimatePresence>
                {collapsed && showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -5, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-full ml-4 px-3 py-1.5 bg-[#171718] text-white text-xs font-semibold rounded-lg pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-xl"
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
        <button id={id} onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-3 w-full transition-all duration-200 ${active ? 'text-[#E8C15A]' : 'text-[#666]'}`}>
            {icon}
            <span className="text-[9px] font-medium text-center leading-none px-0.5">{label}</span>
        </button>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [transitionsEnabled, setTransitionsEnabled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Initial check and resize listener for mobile state
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Persist sidebar state
    useEffect(() => {
        // SSR-safe localStorage access
        if (typeof window === 'undefined') return;

        try {
            const saved = localStorage.getItem('sidebarCollapsed');
            if (saved !== null) {
                setTimeout(() => setIsSidebarCollapsed(saved === 'true'), 0);
            }
            // Enable transitions after a short delay to allow initial render
            requestAnimationFrame(() => {
                setTransitionsEnabled(true);
            });
        } catch (error) {
            console.warn('Failed to load sidebar state from localStorage:', error);
            setTimeout(() => setTransitionsEnabled(true), 0); // Ensure enabled even on error
        }

        // Async: fetch from DB (cross-device sync)
        fetch('/api/user/preferences?keys=sidebarCollapsed', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.prefs?.sidebarCollapsed !== undefined) {
                    const dbVal = data.prefs.sidebarCollapsed === 'true';
                    setIsSidebarCollapsed(dbVal);
                    localStorage.setItem('sidebarCollapsed', String(dbVal));
                }
            })
            .catch(() => {});
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

        fetchNotifications();

        // Poll every 30s, but only when tab is visible
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) return;
            interval = setInterval(fetchNotifications, 30000);
        };
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null; }
        };

        const handleVisibility = () => {
            if (document.hidden) stopPolling();
            else { fetchNotifications(); startPolling(); }
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
        if (pathname === '/dashboard/settings') return 'Settings';
        if (pathname === '/dashboard/admin') return 'Admin';
        return 'Dashboard';
    };

    const isAdmin = user?.role === 'owner' || user?.role === 'instructor';

    const activePage = getActivePage();

    const segments = pathname.split('/').filter(Boolean);
    const isProblemPage = segments[0] === 'dashboard' && segments[1] === 'sheets' && segments.length === 5;

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    const handleBack = () => {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length <= 1) {
            router.push('/');
            return;
        }
        const parentPath = '/' + segments.slice(0, -1).join('/');
        router.push(parentPath);
    };

    const handleNav = (path: string) => { router.push(path); setMobileMenuOpen(false); };

    if (loading) return <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center"><TestCasesLoader /></div>;
    return (
        <div dir="ltr" className="relative min-h-screen bg-[#0B0B0C] text-[#DCDCDC] font-sans selection:bg-[#CFA144] selection:text-[#121212] w-full max-w-[100vw]">

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
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showNotifications ? 'bg-[#E8C15A]/20 text-[#E8C15A]' : 'text-[#A0A0A0] hover:text-[#E8C15A] hover:bg-white/5'}`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <div className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-600 rounded-full border border-[#0B0B0C] flex items-center justify-center text-[8px] font-black text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </div>
                                )}
                            </button>
                        </div>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 text-white/80 hover:text-white">
                            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation (hidden on problem page) */}
            {!isProblemPage && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0C] border-t border-white/10 pb-[env(safe-area-inset-bottom)] grid grid-cols-6 w-full items-end">
                    <MobileNavItem id="mobile-nav-dashboard" icon={<LayoutDashboard size={18} />} label="Home" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                    <MobileNavItem id="mobile-nav-profile" icon={<Code size={18} />} label="Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                    <MobileNavItem id="mobile-nav-sessions" icon={<Play size={18} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                    <MobileNavItem id="mobile-nav-sheets" icon={<BookOpen size={18} />} label="Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                    <MobileNavItem id="mobile-nav-leaderboard" icon={<Trophy size={18} />} label="Rank" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                    <MobileNavItem id="mobile-nav-news" icon={<Bell size={18} />} label="News" active={activePage === 'Team News'} onClick={() => handleNav('/dashboard/news')} />
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
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                drag="x"
                                dragConstraints={{ left: 0 }}
                                dragElastic={{ left: 0, right: 0.2 }}
                                onDragEnd={(e, { offset, velocity }) => {
                                    if (offset.x > 100 || velocity.x > 100) {
                                        setMobileMenuOpen(false);
                                    }
                                }}
                                className="md:hidden fixed top-0 right-0 bottom-0 z-[9999] w-72 bg-[#0B0B0C] border-l border-white/10 shadow-2xl flex flex-col touch-pan-y"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <span className="font-bold text-[#F2F2F2] text-2xl">Menu</span>
                                    <button
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="p-2 text-white/60 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                                    >
                                        <X size={32} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <nav className="flex flex-col gap-6 pt-4">
                                        <NavItem
                                            icon={<Home size={32} />}
                                            label="Home"
                                            active={pathname === '/'}
                                            onClick={() => { router.push('/'); setMobileMenuOpen(false); }}
                                            className="text-lg font-medium"
                                        />
                                        <NavItem
                                            icon={<Settings size={32} />}
                                            label="Settings"
                                            active={activePage === 'Settings'}
                                            onClick={() => handleNav('/dashboard/settings')}
                                            className="text-lg font-medium"
                                        />
                                        {isAdmin && (
                                            <NavItem
                                                icon={<Shield size={32} />}
                                                label="Admin"
                                                active={activePage === 'Admin'}
                                                onClick={() => handleNav('/dashboard/admin')}
                                                className="text-lg font-medium"
                                            />
                                        )}
                                    </nav>
                                </div>

                                <div className="p-4 border-t border-white/10">
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                        <div className="w-8 h-8 rounded-full bg-[#E8C15A]/10 flex items-center justify-center overflow-hidden shrink-0">
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
                                            <p className="text-xs font-bold text-white truncate">{getDisplayName(profile?.name || user?.email)}</p>
                                            <p className="text-[10px] text-[#666] truncate">{user?.email}</p>
                                        </div>
                                        <button
                                            onClick={() => { logout(); router.push('/'); }}
                                            className="p-2 text-[#A0A0A0] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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
                    transition={transitionsEnabled ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0 }} // Disable transition initially
                    className={`bg-[#0B0B0C] border-r border-white/10 flex flex-col shrink-0 fixed h-full z-50 hidden md:flex scrollbar-hide ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}
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

                        {!isSidebarCollapsed && <div className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">Training</div>}
                        <nav className="mt-2 space-y-1 px-2">
                            <NavItem id="onboarding-nav-dashboard" collapsed={isSidebarCollapsed} icon={<LayoutDashboard size={20} />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                            <NavItem id="onboarding-nav-profile" collapsed={isSidebarCollapsed} icon={<Code size={20} />} label="My Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                            <NavItem id="onboarding-nav-sessions" collapsed={isSidebarCollapsed} icon={<Play size={20} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                            <NavItem id="onboarding-nav-sheets" collapsed={isSidebarCollapsed} icon={<BookOpen size={20} />} label="Training Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                            <NavItem id="onboarding-nav-leaderboard" collapsed={isSidebarCollapsed} icon={<Trophy size={20} />} label="Leaderboard" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                            <NavItem id="onboarding-nav-news" collapsed={isSidebarCollapsed} icon={<Bell size={20} />} label="Team News" active={activePage === 'Team News'} onClick={() => handleNav('/dashboard/news')} />
                            {isAdmin && (
                                <NavItem id="onboarding-nav-admin" collapsed={isSidebarCollapsed} icon={<Shield size={20} />} label="Admin" active={activePage === 'Admin'} onClick={() => handleNav('/dashboard/admin')} />
                            )}
                        </nav>
                    </div>

                    <div className="p-2 border-t border-white/5 mt-auto">
                        <Link href="/" className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20 flex items-center justify-center overflow-hidden shrink-0">
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
                                        <p className="text-xs font-bold text-white truncate">{getDisplayName(profile?.name || user?.email)}</p>
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
                transition={transitionsEnabled ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0 }} // Disable transition initially
                className={`${isProblemPage ? 'pt-0 pb-0' : 'pt-14 md:pt-0 pb-16 md:pb-0'} max-md:!ml-0 max-md:!w-full max-w-[100vw]`}
            >
                {!isProblemPage && (
                    <header className="sticky top-0 z-40 w-full h-16 bg-[#0B0B0C] flex items-center justify-between px-4 md:px-8 hidden md:flex">
                        {/* Dynamic Breadcrumbs Layout */}
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#A0A0A0]">
                            <button onClick={handleBack} className="hover:text-white transition-colors mr-2"><ChevronLeft size={16} /></button>

                            {pathname.split('/').filter(Boolean).map((segment, index, array) => {
                                // Map segments to readable labels
                                let label = segment;

                                // Specific Overrides
                                if (segment === 'dashboard') label = 'DASHBOARD';
                                else if (segment === 'sheets') label = 'SHEETS';
                                else if (segment === 'roadmap') label = 'ROADMAP';
                                else if (segment === 'profile') label = 'PROFILE';
                                else if (segment === 'leaderboard') label = 'LEADERBOARD';
                                else if (segment === 'sessions') label = 'SESSIONS';
                                else if (segment === 'news') label = 'NEWS';
                                else if (segment === 'admin') label = 'ADMIN';
                                else if (segment.startsWith('level')) label = `LEVEL ${segment.replace('level', '')}`;
                                else if (segment.startsWith('sheet-')) label = `SHEET ${segment.replace('sheet-', '').toUpperCase()}`;
                                else if (segment.startsWith('week-')) label = `WEEK ${segment.replace('week-', '')}`;
                                else if (segment.length > 20) label = '...'; // Truncate IDs/UUIDs
                                else label = segment.toUpperCase().replace(/-/g, ' ');

                                const isLast = index === array.length - 1;

                                return (
                                    <div key={segment} className="flex items-center gap-2">
                                        {index > 0 && <ChevronRight size={14} className="text-[#444]" />}
                                        <span className={isLast ? "text-[#F2F2F2]" : "hover:text-[#F2F2F2] transition-colors"}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`notification-trigger w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showNotifications ? 'bg-[#E8C15A]/20 text-[#E8C15A]' : 'text-[#A0A0A0] hover:text-[#E8C15A] hover:bg-white/5'}`}
                                >
                                    <Bell size={18} />
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-600 rounded-full border border-[#0B0B0C] flex items-center justify-center text-[8px] font-black text-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="notification-dropdown absolute right-0 mt-2 w-80 bg-[#161617] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-white">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <span className="text-[10px] bg-[#E8C15A]/10 text-[#E8C15A] px-2 py-0.5 rounded-full font-bold">{unreadCount} NEW</span>
                                                )}
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center">
                                                        <Bell className="w-8 h-8 text-[#333] mx-auto mb-2 opacity-20" />
                                                        <p className="text-xs text-[#666]">No notifications yet</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((n) => (
                                                        <div 
                                                            key={n.id} 
                                                            onClick={() => markAsRead(n.id)}
                                                            className="p-4 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer group border-b border-white/[0.02] last:border-0"
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'achievement' ? 'bg-[#E8C15A]/10 text-[#E8C15A]' : n.type === 'leaderboard' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#A0A0A0]'}`}>
                                                                {n.type === 'achievement' ? <Trophy size={14} /> : n.type === 'leaderboard' ? <Trophy size={14} /> : <Bell size={14} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-[#F2F2F2] mb-0.5">{n.title}</p>
                                                                <p className="text-[11px] text-[#A0A0A0] leading-relaxed line-clamp-3">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[9px] text-[#444] mt-1.5 uppercase font-black">
                                                                    {new Date(n.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {!n.is_read && <div className="w-1.5 h-1.5 bg-[#E8C15A] rounded-full mt-1 shrink-0"></div>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            {notifications.length > 0 && (
                                                <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                                                    <button 
                                                        onClick={markAllAsRead}
                                                        className="text-[10px] font-bold text-[#A0A0A0] hover:text-[#E8C15A] transition-colors uppercase tracking-wider"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <Link href="/dashboard/settings" className="w-8 h-8 flex items-center justify-center text-[#A0A0A0] hover:text-[#E8C15A] hover:bg-white/5 rounded-lg transition-all">
                                <Settings size={18} />
                            </Link>
                            <button onClick={() => { logout(); router.push('/'); }} className="w-8 h-8 flex items-center justify-center text-[#A0A0A0] hover:text-red-500 hover:bg-white/5 rounded-lg transition-all">
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
