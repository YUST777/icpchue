'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Hexagon, ChevronDown, Pencil } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { fetchWithCache } from '@/lib/api-cache';

import AchievementsWidget from '@/components/AchievementsWidget';
import CurrentSheetWidget from '@/components/dashboard/CurrentSheetWidget';
import { AchievementRevealModal } from '@/components/AchievementRevealModal';
import { UserProfile } from '@/lib/types';
import { useAchievements } from '@/hooks/useAchievements';

// Extracted Components
import { ProfileEditModal } from '@/components/dashboard/profile/ProfileEditModal';
import { SocialLinks } from '@/components/dashboard/profile/SocialLinks';
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

    const [showEditModal, setShowEditModal] = useState(false);
    const [editField, setEditField] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isUserInfoOpen, setUserInfoOpen] = useState(false);
    const [uploadingPfp, setUploadingPfp] = useState(false);
    const [pfpError, setPfpError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sheetsRank, setSheetsRank] = useState<number | null>(null);

    // Achievements hook for popup reveals
    const { unseenAchievement, markAsSeen } = useAchievements(isAuthenticated);

    const openEditModal = (field: string, currentValue: string) => {
        if (field === 'codeforces') {
            window.location.href = '/api/auth/codeforces/login';
            return;
        }
        setEditField(field);
        setInputValue(currentValue || '');
        setShowEditModal(true);
    };

    useEffect(() => {
        const fetchRank = async () => {
            try {
                // Cache rank for 5 minutes
                const lbData = await fetchWithCache<any>('/api/leaderboard/sheets', {
                    credentials: 'include'
                }, 300);

                if (lbData.leaderboard && Array.isArray(lbData.leaderboard)) {
                    const myEntryIndex = lbData.leaderboard.findIndex((u: { userId: number }) => u.userId === user?.id);
                    if (myEntryIndex !== -1) {
                        setSheetsRank(myEntryIndex + 1);
                    }
                }
            } catch (err) {
                console.error('Failed to load rank', err);
            }
        };

        if (user) fetchRank();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updateData: Record<string, string> = {};

            let finalValue = inputValue;
            if (editField === 'telegram') {
                finalValue = inputValue.replace('@', '').trim();
            } else if (editField === 'codeforces') {
                if (inputValue.includes('codeforces.com/profile/')) {
                    const parts = inputValue.split('/');
                    finalValue = parts[parts.length - 1] || inputValue;
                }
            }

            if (editField === 'telegram') updateData.telegram_username = finalValue;
            if (editField === 'codeforces') updateData.codeforces_profile = finalValue;
            if (editField === 'leetcode') updateData.leetcode_profile = finalValue;

            await fetch('/api/auth/update-profile', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (editField === 'codeforces') {
                try {
                    await fetch('/api/user/refresh-cf', {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (cfError) {
                    console.error('Failed to refresh Codeforces data:', cfError);
                }
            }

            await refreshProfile();
            setSaved(true);
            setTimeout(() => { setSaved(false); setShowEditModal(false); }, 1500);
        } catch (err) { console.error('Save failed:', err); }
        setSaving(false);
    };

    const handleDelete = async (field: 'telegram' | 'codeforces') => {
        if (!window.confirm(`Are you sure you want to delete your ${field === 'telegram' ? 'Telegram' : 'Codeforces'} profile data?`)) return;
        try {
            await fetch('/api/user/delete-profile-data', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field })
            });
            await refreshProfile();
        } catch (err) { console.error('Delete failed:', err); }
    };

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

    const cfData = profile.codeforces_data || {};
    const rating = cfData.rating || 'N/A';
    const rank = cfData.rank || 'Unrated';
    const profilePicture = user?.profile_picture ? `/pfps/${user.profile_picture}` : null;

    return (
        <>
            {unseenAchievement && (
                <AchievementRevealModal
                    achievement={unseenAchievement}
                    onClose={() => markAsSeen(unseenAchievement.id)}
                    onClaim={markAsSeen}
                />
            )}

            <div className="space-y-6 animate-fade-in">
                {/* Mobile User Info Accordion */}
                <div className="md:hidden bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                    <button onClick={() => setUserInfoOpen(!isUserInfoOpen)} className="w-full flex items-center justify-between p-4 text-left">
                        <div className="flex items-center gap-3"><Hexagon className="text-[#E8C15A]" size={20} /><span className="font-medium text-[#F2F2F2]">User Info</span></div>
                        <ChevronDown size={18} className={`text-[#A0A0A0] transition-transform ${isUserInfoOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isUserInfoOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                            {[{ l: 'Telegram', v: profile.telegram_username, f: 'telegram' }, { l: 'Codeforces', v: profile.codeforces_profile, f: 'codeforces' }, { l: 'LeetCode', v: profile.leetcode_profile, f: 'leetcode' }].map(item => (
                                <div key={item.l} className="flex items-center justify-between">
                                    <span className="text-xs text-[#A0A0A0]">{item.l}</span>
                                    <div className="flex items-center gap-2">
                                        {item.v ? <span className="text-xs text-[#F2F2F2]">{item.v}</span> : <span className="text-xs text-[#666]">Not set</span>}
                                        {item.f === 'codeforces' ? (
                                            <button
                                                onClick={() => openEditModal(item.f, item.v || '')}
                                                className="px-2 py-0.5 bg-[#E8C15A]/10 text-[#E8C15A] hover:bg-[#E8C15A]/20 rounded-md text-[10px] font-bold transition-colors"
                                            >
                                                {item.v ? 'Re-link' : 'Link'}
                                            </button>
                                        ) : (
                                            <button onClick={() => openEditModal(item.f, item.v || '')} className="text-[#E8C15A] hover:text-[#E8C15A]/80">
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {/* Top Row: Identity + Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <IdentityCard
                            user={user}
                            profile={profile}
                            profilePicture={profilePicture}
                            uploadingPfp={uploadingPfp}
                            pfpError={pfpError}
                            fileInputRef={fileInputRef}
                            handlePfpUpload={handlePfpUpload}
                            handleDeletePfp={handleDeletePfp}
                            rating={rating}
                            rank={rank}
                        />

                        <div className="space-y-6 flex flex-col">
                            <LeaderboardWidget sheetsRank={sheetsRank} />
                            <SocialLinks
                                profile={profile}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                            />
                        </div>

                        <div className="w-full">
                            <CurrentSheetWidget sheet={stats.currentSheet} loading={statsLoading} />
                        </div>

                        <div className="w-full">
                            <AchievementsWidget profile={profile} user={user} />
                        </div>
                    </div>
                </div>
            </div>

            <ProfileEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                editField={editField}
                inputValue={inputValue}
                setInputValue={setInputValue}
                onSave={handleSave}
                saving={saving}
                saved={saved}
            />

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
