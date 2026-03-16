'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Hexagon, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[#0A0A0A]" />}>
            <ResetPasswordInner />
        </Suspense>
    );
}

function ResetPasswordInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const getStrength = (pwd: string) => {
        if (!pwd) return { pct: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 9) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (score < 3) return { pct: 30, label: 'Weak', color: 'bg-red-500' };
        if (score < 4) return { pct: 60, label: 'Good', color: 'bg-yellow-500' };
        if (score < 5) return { pct: 80, label: 'Strong', color: 'bg-green-400' };
        return { pct: 100, label: 'Very Strong', color: 'bg-green-500' };
    };

    const strength = getStrength(password);

    if (!token) {
        return (
            <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A] flex items-center justify-center px-8">
                <div className="max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-400/80 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">Invalid Link</h2>
                    <p className="text-white/40 text-sm mb-8">This reset link is missing or malformed. Please request a new one.</p>
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#E8C15A]/10"
                    >
                        Request a new link
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage("Passwords don't match");
            return;
        }
        if (password.length < 9) {
            setStatus('error');
            setMessage('Password must be at least 9 characters');
            return;
        }
        if (!/[A-Z]/.test(password)) {
            setStatus('error');
            setMessage('Password needs at least one uppercase letter');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatus('success');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to reset password');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A] flex flex-row-reverse">
            {/* Right Side - Form */}
            <div className="w-full lg:w-[40%] min-h-[100dvh] flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 bg-[#0C0C0C] relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="w-full max-w-[400px] mx-auto z-10">
                    <div className="mb-10 lg:hidden">
                        <Link href="/" className="inline-block mb-6">
                            <Image src="/icons/icon-512.webp" alt="ICPC HUE" width={48} height={48} className="h-12 w-auto" />
                        </Link>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">New Password</h1>
                    <p className="text-white/40 text-sm mb-8">Create a strong password for your account</p>

                    {status === 'success' ? (
                        <div className="space-y-6">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                                    <CheckCircle className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Password Updated</h3>
                                <p className="text-white/50 text-sm">Redirecting to login...</p>
                            </div>
                            <Link
                                href="/login"
                                className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10"
                            >
                                Sign In Now
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {status === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-shake">
                                    {message}
                                </div>
                            )}

                            <div>
                                <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (status === 'error') setStatus('idle'); }}
                                        placeholder="Min 9 characters, 1 uppercase"
                                        className="w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all pr-12 border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20"
                                        required
                                        minLength={9}
                                        dir="ltr"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-[10px] mb-1 ml-1">
                                            <span className="text-white/30 uppercase tracking-wider">Strength</span>
                                            <span className={strength.pct >= 60 ? 'text-green-400' : 'text-white/40'}>{strength.label}</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-1">
                                            <div className={`h-1 rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); if (status === 'error') setStatus('idle'); }}
                                        placeholder="Re-enter your password"
                                        className="w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all pr-12 border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20"
                                        required
                                        dir="ltr"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center">
                        <Link href="/login" className="text-white/30 text-xs font-medium hover:text-[#E8C15A] transition-colors">
                            Back to Sign In
                        </Link>
                    </div>

                    <div className="mt-12 text-center lg:hidden">
                        <Link href="/" className="text-[10px] uppercase font-bold tracking-widest text-white/10 hover:text-white/30 transition-colors">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Left Side - Branding */}
            <div className="hidden lg:flex w-[60%] min-h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-20 relative overflow-hidden">
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                        <Image src="/icons/icon-512.webp" alt="ICPC HUE" width={32} height={32} className="h-8 w-auto drop-shadow-2xl" />
                    </Link>
                </div>

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.03),transparent_50%)]" />

                <div className="max-w-xl relative">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />

                    <blockquote className="text-4xl text-white/90 font-medium leading-tight mb-12 tracking-tight">
                        &quot;A strong password is the first step to <span className="text-[#E8C15A] italic font-bold">securing your progress</span>. Choose wisely.&quot;
                    </blockquote>

                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-white/80 font-bold text-base tracking-tight">ICPC HUE Team</h4>
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">First ICPC Community at Horus University</p>
                    </div>
                </div>

                <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between">
                    <p className="text-white/5 text-[9px] font-bold uppercase tracking-[0.2em]">&copy; 2026 HORUS UNIVERSITY</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
}
