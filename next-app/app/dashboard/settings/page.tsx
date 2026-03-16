'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Check, Settings, User, Shield, Loader2, MessageCircle, Trophy, Code, Globe } from 'lucide-react';

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

    const studentId = user?.email?.split('@')[0] || 'unknown';
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

    const PrivacyToggle = ({
        icon: Icon,
        label,
        description,
        field,
        value
    }: {
        icon: React.ComponentType<{ size?: number; className?: string }>;
        label: string;
        description: string;
        field: string;
        value: boolean;
    }) => (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-start gap-3">
                <Icon size={18} className="text-[#E8C15A] mt-0.5" />
                <div>
                    <p className="text-sm text-[#F2F2F2]">{label}</p>
                    <p className="text-xs text-[#666]">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {savingPrivacy === field && <Loader2 size={16} className="animate-spin text-[#E8C15A]" />}
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handlePrivacyChange(field, e.target.checked)}
                        disabled={savingPrivacy !== null || loadingPrivacy}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E8C15A] peer-disabled:opacity-50"></div>
                </label>
            </div>
        </div>
    );

    return (
        <>

            <div className="space-y-6 animate-fade-in w-full">
                <div className="flex items-center gap-3"><Settings className="text-[#E8C15A]" size={24} /><h2 className="text-xl md:text-2xl font-bold text-[#F2F2F2]">Settings</h2></div>

                {/* Profile Sharing */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><User size={20} className="text-[#E8C15A]" />Profile Sharing</h3>
                    <p className="text-sm text-[#A0A0A0] mb-4">Share your public profile with others.</p>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={profileUrl} className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[#A0A0A0] truncate" />
                        <button onClick={handleCopy} className="px-4 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-colors flex items-center gap-2">
                            {copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy</>}
                        </button>
                    </div>
                </div>

                {/* Privacy Settings - 3 Toggles */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><Shield size={20} className="text-[#E8C15A]" />Privacy</h3>

                    {loadingPrivacy ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-[#E8C15A]" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            <PrivacyToggle
                                icon={Trophy}
                                label="Codeforces Leaderboard"
                                description="Show on Codeforces rating leaderboard"
                                field="showOnCfLeaderboard"
                                value={showOnCfLeaderboard}
                            />
                            <PrivacyToggle
                                icon={Code}
                                label="Training Sheets Leaderboard"
                                description="Show on training sheets leaderboard"
                                field="showOnSheetsLeaderboard"
                                value={showOnSheetsLeaderboard}
                            />
                            <PrivacyToggle
                                icon={Globe}
                                label="Public Profile"
                                description="Allow others to view your profile page"
                                field="showPublicProfile"
                                value={showPublicProfile}
                            />
                        </div>
                    )}


                </div>

                {/* Support */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><MessageCircle size={20} className="text-[#E8C15A]" />Support</h3>
                    <p className="text-sm text-[#A0A0A0] mb-4">Need help? Have questions or feedback? Reach out to us directly.</p>
                    <a
                        href="https://t.me/yousefmsm1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                        Talk to Support
                    </a>
                </div>

                {/* Logout Button */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold rounded-lg transition-colors">
                        Logout
                    </button>
                </div>
            </div><style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
