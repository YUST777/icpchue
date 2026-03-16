'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface HandleInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (handle: string) => void;
}

export default function HandleInputModal({ isOpen, onClose, onSave }: HandleInputModalProps) {
    const [handle, setHandle] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = handle.trim();

        if (!trimmed) {
            setError('Handle cannot be empty');
            return;
        }

        if (trimmed.length < 3 || trimmed.length > 24) {
            setError('Handle must be between 3 and 24 characters');
            return;
        }

        // Basic validation: alphanumeric, underscore, hyphen
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            setError('Handle can only contain letters, numbers, underscores, and hyphens');
            return;
        }

        onSave(trimmed);
        setHandle('');
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Enter Codeforces Handle</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    Enter your Codeforces handle to view your submissions. This will be saved locally in your browser.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => {
                            const clientId = process.env.NEXT_PUBLIC_CF_CLIENT_ID; // NEXT_PUBLIC_CF_CLIENT_ID
                            const redirectUri = window.location.origin + '/api/auth/callback/codeforces';
                            const oauthUrl = `https://codeforces.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid`;
                            window.location.href = oauthUrl;
                        }}
                        className="w-full h-12 bg-white text-black font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                        <img src="https://codeforces.org/s/0/images/codeforces-logo-with-telegram.png" alt="CF" className="w-5 h-5 object-contain" />
                        Connect Securely with Codeforces
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase">Or manual entry (Legacy)</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <input
                                type="text"
                                value={handle}
                                onChange={(e) => {
                                    setHandle(e.target.value);
                                    setError('');
                                }}
                                placeholder="e.g., tourist, Petr"
                                className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8C15A] transition-colors"
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-400">{error}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20 hover:bg-[#E8C15A]/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                Save Locally
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

