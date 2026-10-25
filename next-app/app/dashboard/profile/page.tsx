'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { fetchWithCache } from '@/lib/cache/api-cache';

import AchievementsWidget from '@/components/achievements/AchievementsWidget';
import CurrentSheetWidget from '@/components/dashboard/CurrentSheetWidget';
import { UserProfile } from '@/lib/types';

// Extracted Components
import { LeaderboardWidget } from '@/components/dashboard/profile/LeaderboardWidget';
import { IdentityCard } from '@/components/dashboard/profile/IdentityCard';

export default function ProfilePage() {
    const { user, profile: authProfile, refreshProfile, isAuthenticated } = useAuth();
    const profile: UserProfile = (authProfile as unknown as UserProfile) || {
        name: user?.email?.split('@')[0] || 'User',
        role: 'student',
        id: user?.id || 0,
        email: user?.email || ''
    };

    const { stats, loading: statsLoading } = useDashboardStats();

    const [uploadingPfp, setUploadingPfp] = useState(false);
    const [pfpError, setPfpError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sheetsRank, setSheetsRank] = useState<number | null>(null);

    // Achievements hook for popup reveals

    useEffect(() => {
        const fetchRank = async () => {
            try {
                // Cache rank for 5 minutes
                // A student is ranked on their own level's board: Level 0 or Level 1.
                for (const level of [0, 1]) {
                    const lbData = await fetchWithCache<any>(`/api/leaderboard/sheets?level=${level}`, {
                        credentials: 'include'
                    }, 300);
                    if (!Array.isArray(lbData.leaderboard)) continue;
                    const myEntryIndex = lbData.leaderboard.findIndex((u: { userId: number }) => u.userId === user?.id);
                    if (myEntryIndex !== -1) {
                        setSheetsRank(myEntryIndex + 1);
                        break;
                    }
                }
            } catch (err) {
                console.error('Failed to load rank', err);
            }
        };

        if (user) fetchRank();
    }, [user]);

    const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setPfpError('File too large. Maximum size is 5MB.');
            setTimeout(() => setPfpError(''), 5000);
            return;
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setPfpError('Only PNG, JPG, and WebP images are allowed.');
            setTimeout(() => setPfpError(''), 5000);
            return;
        }

        setPfpError('');
        setUploadingPfp(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/user/upload-pfp', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                setPfpError(data.error || 'Failed to upload image');
                setTimeout(() => setPfpError(''), 5000);
            } else {
                await refreshProfile();
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setPfpError('Failed to upload image');
            setTimeout(() => setPfpError(''), 5000);
        } finally {
            setUploadingPfp(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeletePfp = async () => {
        if (!window.confirm('Are you sure you want to delete your profile picture?')) return;

        setUploadingPfp(true);
        setPfpError('');

        try {
            const res = await fetch('/api/user/delete-pfp', {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                await refreshProfile();
            } else {
                setPfpError(data.error || 'Failed to delete profile picture');
                setTimeout(() => setPfpError(''), 5000);
            }
        } catch (err) {
            console.error('Delete pfp failed:', err);
            setPfpError('Failed to delete profile picture');
            setTimeout(() => setPfpError(''), 5000);
        } finally {
            setUploadingPfp(false);
        }
    };

    // Profile pictures are disabled site-wide (pfp files don't persist on Vercel
    // serverless and 404). Always use the initials avatar.
    const profilePicture = null;

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-6">
                    {/* Top Row: Identity + Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div className="flex flex-col gap-6">
                            <IdentityCard
                                user={user as { id?: number; email?: string; student_id?: string; role?: string } | undefined}
                                profile={profile}
                                profilePicture={profilePicture}
                                uploadingPfp={uploadingPfp}
                                pfpError={pfpError}
                                fileInputRef={fileInputRef}
                                handlePfpUpload={handlePfpUpload}
                                handleDeletePfp={handleDeletePfp}
                            />
                            <CurrentSheetWidget sheet={stats.currentSheet} loading={statsLoading} />
                        </div>

                        <div className="flex flex-col gap-6">
                            <LeaderboardWidget sheetsRank={sheetsRank} />
                            <AchievementsWidget profile={profile as unknown as Record<string, unknown>} user={user || undefined} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
