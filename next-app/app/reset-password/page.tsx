'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[#0b0b0c]" />}>
            <ResetPasswordInner />
        </Suspense>
    );
}

function ResetPasswordInner() {
    const router = useRouter();
    // Supabase puts a short-lived recovery session in the URL fragment of the
    // emailed link. Fragments never reach the server, so read it here, then
    // strip it from the address bar.
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tokenHash, setTokenHash] = useState<string | null>(null);
    const [linkState, setLinkState] = useState<'checking' | 'ready' | 'invalid'>('checking');
    const [linkError, setLinkError] = useState('This reset link is invalid, expired, or was already used. Please request a new one.');

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const token = params.get('access_token');
        const hash = query.get('token_hash');
        if (hash && (query.get('type') || 'recovery') === 'recovery') {
            // Do not spend the token on page load (email scanners load pages too).
            setTokenHash(hash);
            setLinkState('ready');
        } else if (token && params.get('type') === 'recovery') {
            setAccessToken(token);
            setLinkState('ready');
        } else {
            if (params.get('error_code') === 'otp_expired' || params.get('error')) {
                setLinkError('This reset link has expired or was already used. Please request a new one.');
            }
            setLinkState('invalid');
        }
        if (window.location.hash || window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

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

    if (linkState === 'checking') {
        return <div className="min-h-[100dvh] w-full bg-[#0A0A0A]" />;
    }

    if (linkState === 'invalid' || (!accessToken && !tokenHash)) {
        return (
            <div dir="ltr" className="flex min-h-[100dvh] w-full items-center justify-center bg-[#0b0b0c] px-6">
                <div className="w-full max-w-md text-center">
                    <AlertCircle className="mx-auto mb-6 h-14 w-14 text-red-300/80" />
                    <h2 className="mb-3 text-2xl font-medium text-white">Invalid link</h2>
                    <p className="mb-8 text-sm leading-6 text-white/50">{linkError}</p>
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-2 rounded-[10px] bg-[#E8C15A] px-8 py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76]"
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
                body: JSON.stringify(tokenHash ? { tokenHash, newPassword: password } : { accessToken, newPassword: password }),
            });
            const data = await res.json().catch(() => ({}));

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
        <div dir="ltr" className="flex min-h-[100dvh] w-full flex-row-reverse bg-[#0b0b0c]">
            {/* Right Side - Form */}
            <div className="relative flex min-h-[100dvh] w-full flex-col justify-center bg-[#111214] px-6 py-10 sm:px-16 lg:w-[40%] lg:px-20 lg:py-12">

                <div className="w-full max-w-[400px] mx-auto z-10">
                    <div className="mb-10 lg:hidden">
                        <Link href="/" className="inline-block mb-6">
                            <Image src="/icons/icon-512.webp" alt="ICPC HUE" width={48} height={48} className="h-12 w-auto" />
                        </Link>
                    </div>

                    <h1 className="mb-2 text-3xl font-medium tracking-tight text-white">New Password</h1>
                    <p className="mb-8 text-sm text-white/50">Create a strong password for your account</p>

                    {status === 'success' ? (
                        <div className="space-y-6">
                            <div className="rounded-[10px] border border-emerald-400/25 bg-emerald-400/10 p-6 text-center">
                                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                                    <CheckCircle className="w-7 h-7" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-white">Password Updated</h3>
                                <p className="text-sm text-white/55">Redirecting to login...</p>
                            </div>
                            <Link
                                href="/login"
                                className="group flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8C15A] py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76]"
                            >
                                Sign In Now
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {status === 'error' && (
                                <div className="animate-shake rounded-[10px] border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-300">
                                    {message}
                                </div>
                            )}

                            <div>
                                <label className="mb-2 ml-1 block text-xs font-medium text-white/60">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (status === 'error') setStatus('idle'); }}
                                        placeholder="Min 9 characters, 1 uppercase"
                                        className="w-full rounded-[10px] border border-white/10 bg-[#0b0b0c] px-4 py-3.5 pr-12 text-sm text-white placeholder-white/25 transition-colors focus:border-[#E8C15A]/50 focus:outline-none focus:ring-1 focus:ring-[#E8C15A]/30"
                                        required
                                        minLength={9}
                                        dir="ltr"
                                    />
                                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70">
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
                                <label className="mb-2 ml-1 block text-xs font-medium text-white/60">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); if (status === 'error') setStatus('idle'); }}
                                        placeholder="Re-enter your password"
                                        className="w-full rounded-[10px] border border-white/10 bg-[#0b0b0c] px-4 py-3.5 pr-12 text-sm text-white placeholder-white/25 transition-colors focus:border-[#E8C15A]/50 focus:outline-none focus:ring-1 focus:ring-[#E8C15A]/30"
                                        required
                                        dir="ltr"
                                    />
                                    <button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70">
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="group flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8C15A] py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76] disabled:cursor-not-allowed disabled:opacity-50"
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
                        <Link href="/" className="text-xs text-white/35 transition-colors hover:text-white/70">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Left Side - Branding */}
            <div className="relative hidden min-h-[100dvh] w-[60%] items-center justify-center overflow-hidden border-r border-white/10 bg-[#0b0b0c] px-20 lg:flex">
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                        <Image src="/icons/icon-512.webp" alt="ICPC HUE" width={32} height={32} className="h-8 w-auto" />
                    </Link>
                </div>

                <div className="max-w-xl relative">
                    <div className="mb-6 h-px w-16 bg-[#E8C15A]" />

                    <blockquote className="mb-12 text-3xl font-medium leading-tight tracking-tight text-white/90 xl:text-4xl">
                        &quot;A strong password is the first step to <span className="text-[#E8C15A] italic font-bold">securing your progress</span>. Choose wisely.&quot;
                    </blockquote>

                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-base font-medium tracking-tight text-white/80">ICPC HUE Team</h4>
                        <p className="text-xs text-white/35">First ICPC Community at Horus University</p>
                    </div>
                </div>

                <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between">
                    <p className="text-xs text-white/25">© 2026 Horus University</p>
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
