'use client';

import { User } from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

interface HandleInputSectionProps {
    onSave: (handle: string) => void;
    compact?: boolean;
}

export default function HandleInputSection({ onSave, compact = false }: HandleInputSectionProps) {
    const handleLogin = () => {
        window.location.href = '/api/auth/codeforces/login';
    };

    if (compact) {
        return (
            <div className="w-full max-w-md mx-auto space-y-4">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#E8C15A]/10 flex items-center justify-center mx-auto border border-[#E8C15A]/20">
                        <User size={24} className="text-[#E8C15A]" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Connect Codeforces</h3>
                    <p className="text-xs text-white/60">
                        Sign in to track your progress
                    </p>
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full px-4 py-2.5 bg-[#E8C15A] hover:bg-[#d6b04e] active:bg-[#c4a03e] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm touch-manipulation"
                >
                    <SiCodeforces size={18} />
                    Sign in with Codeforces
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-[#0B0B0C]">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-[#E8C15A]/10 flex items-center justify-center mx-auto border border-[#E8C15A]/20">
                        <User size={32} className="text-[#E8C15A]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Connect Codeforces</h2>
                    <p className="text-sm text-white/60">
                        Link your Codeforces account to track your submissions automatically.
                    </p>
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full px-4 py-3 bg-[#E8C15A] hover:bg-[#d6b04e] active:bg-[#c4a03e] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#E8C15A]/20 touch-manipulation"
                >
                    <SiCodeforces size={20} />
                    Sign in with Codeforces
                </button>
            </div>
        </div>
    );
}
