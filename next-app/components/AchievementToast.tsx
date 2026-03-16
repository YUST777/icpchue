'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementRevealModal } from '@/components/AchievementRevealModal';

const AUTH_PAGES = ['/register', '/login', '/forgot-password', '/reset-password'];

/**
 * GlobalAchievementPopup
 * 
 * This component wraps the existing AchievementRevealModal and useAchievements hook
 * to display achievement notifications globally (on any page) after login.
 * 
 * Previously, achievements only popped up on /dashboard/profile.
 * Now they will appear on any page when the user has unseen achievements.
 */
export default function GlobalAchievementPopup() {
    const pathname = usePathname();
    const { isAuthenticated, loading } = useAuth();
    const onAuthPage = pathname ? AUTH_PAGES.includes(pathname) : false;
    const shouldFetch = isAuthenticated && !loading && !onAuthPage;
    const { unseenAchievement, markAsSeen } = useAchievements(shouldFetch);

    const handleClose = useCallback(() => {
        if (unseenAchievement) markAsSeen(unseenAchievement.id);
    }, [markAsSeen, unseenAchievement?.id]);

    if (!isAuthenticated || !unseenAchievement) {
        return null;
    }

    return (
        <AchievementRevealModal
            achievement={unseenAchievement}
            onClose={handleClose}
            onClaim={markAsSeen}
        />
    );
}
