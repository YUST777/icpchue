'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import BackfillCard from '@/components/settings/BackfillCard';
import { PageHeader } from '@/components/dashboard/PageHeader';

type PrivacyToggleProps = {
    label: string;
    description: string;
    field: string;
    value: boolean;
    savingPrivacy: string | null;
    loadingPrivacy: boolean;
    onChange: (field: string, value: boolean) => void;
};

function PrivacyToggle({
    label,
    description,
    field,
    value,
    savingPrivacy,
    loadingPrivacy,
    onChange,
}: PrivacyToggleProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
                <p className="text-sm leading-5 text-[var(--color-text)]">{label}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {savingPrivacy === field && <Loader2 size={16} className="animate-spin text-[#E8C15A]" aria-label="Saving" />}
                <label className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => onChange(field, e.target.checked)}
                        disabled={savingPrivacy !== null || loadingPrivacy}
                        aria-label={label}
                        className="sr-only peer"
                    />
                    <span className="relative block h-6 w-11 rounded-full border border-white/10 bg-white/[0.12] transition-colors peer-checked:border-[#E8C15A]/50 peer-checked:bg-[#E8C15A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#E8C15A]/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface)] peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
                </label>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [copied, setCopied] = useState(false);

    // Privacy settings state
    const [showOnCfLeaderboard, setShowOnCfLeaderboard] = useState(true);
    const [showOnSheetsLeaderboard, setShowOnSheetsLeaderboard] = useState(true);
    const [showPublicProfile, setShowPublicProfile] = useState(true);
    const [loadingPrivacy, setLoadingPrivacy] = useState(true);
    const [savingPrivacy, setSavingPrivacy] = useState<string | null>(null);

    const studentId = user?.email?.includes('@') ? user.email.split('@')[0] : 'unknown';
    const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${studentId}` : '';

    // Load current privacy settings on mount
    useEffect(() => {
        const fetchPrivacy = async () => {
            try {
                const res = await fetch('/api/user/privacy', {
                    credentials: 'include'
                });

                if (res.ok) {
                    const data = await res.json();
                    setShowOnCfLeaderboard(data.showOnCfLeaderboard ?? true);
                    setShowOnSheetsLeaderboard(data.showOnSheetsLeaderboard ?? true);
                    setShowPublicProfile(data.showPublicProfile ?? true);
                }
            } catch (error) {
                console.error('Error fetching privacy settings:', error);
            } finally {
                setLoadingPrivacy(false);
            }
        };

        fetchPrivacy();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const handlePrivacyChange = async (field: string, value: boolean) => {
        setSavingPrivacy(field);

        // Optimistic update
        if (field === 'showOnCfLeaderboard') setShowOnCfLeaderboard(value);
        if (field === 'showOnSheetsLeaderboard') setShowOnSheetsLeaderboard(value);
        if (field === 'showPublicProfile') setShowPublicProfile(value);

        try {
            const res = await fetch('/api/user/privacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ [field]: value })
            });

            if (!res.ok) {
                // Revert on error
                if (field === 'showOnCfLeaderboard') setShowOnCfLeaderboard(!value);
                if (field === 'showOnSheetsLeaderboard') setShowOnSheetsLeaderboard(!value);
                if (field === 'showPublicProfile') setShowPublicProfile(!value);
                console.error('Failed to update privacy setting');
            }
        } catch (error) {
            // Revert on error
            if (field === 'showOnCfLeaderboard') setShowOnCfLeaderboard(!value);
            if (field === 'showOnSheetsLeaderboard') setShowOnSheetsLeaderboard(!value);
            if (field === 'showPublicProfile') setShowPublicProfile(!value);
            console.error('Error updating privacy:', error);
        } finally {
            setSavingPrivacy(null);
        }
    };

    return (
        <>

            <div className="w-full space-y-6">
                <PageHeader title="Settings" subtitle="Your public profile, privacy and Codeforces import." />

                {/* Profile Sharing */}
                <section className="ui-card p-4 sm:p-5">
                    <h3 className="mb-3 text-lg font-medium text-[var(--color-text)]">Profile sharing</h3>
                    <p className="mb-4 text-sm leading-6 text-[var(--color-text-secondary)]">Share your public profile with others.</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input type="text" readOnly value={profileUrl} aria-label="Public profile URL" className="ui-field min-w-0 flex-1 truncate" />
                        <button onClick={handleCopy} className="ui-button-primary w-full shrink-0 sm:w-auto">
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </section>

                {/* Privacy Settings - 3 Toggles */}
                <section className="ui-card p-4 sm:p-5">
                    <h3 className="mb-3 text-lg font-medium text-[var(--color-text)]">Privacy</h3>

                    {loadingPrivacy ? (
                        <div className="space-y-4 py-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-40 rounded" />
                                        <Skeleton className="h-3 w-56 rounded" />
                                    </div>
                                    <Skeleton className="h-6 w-11 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.06]">
                            <PrivacyToggle
                                label="Codeforces leaderboard"
                                description="Show on Codeforces rating leaderboard"
                                field="showOnCfLeaderboard"
                                value={showOnCfLeaderboard}
                                savingPrivacy={savingPrivacy}
                                loadingPrivacy={loadingPrivacy}
                                onChange={handlePrivacyChange}
                            />
                            <PrivacyToggle
                                label="Training sheets leaderboard"
                                description="Show on training sheets leaderboard"
                                field="showOnSheetsLeaderboard"
                                value={showOnSheetsLeaderboard}
                                savingPrivacy={savingPrivacy}
                                loadingPrivacy={loadingPrivacy}
                                onChange={handlePrivacyChange}
                            />
                            <PrivacyToggle
                                label="Public profile"
                                description="Allow others to view your profile page"
                                field="showPublicProfile"
                                value={showPublicProfile}
                                savingPrivacy={savingPrivacy}
                                loadingPrivacy={loadingPrivacy}
                                onChange={handlePrivacyChange}
                            />
                        </div>
                    )}


                </section>

                {/* Backfill from Codeforces */}
                <BackfillCard />

                {/* Logout Button */}
                <section className="ui-card p-4 sm:p-5">
                    <button onClick={handleLogout} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-400/[0.08] px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/[0.14]">
                        Logout
                    </button>
                </section>
            </div>
        </>
    );
}
