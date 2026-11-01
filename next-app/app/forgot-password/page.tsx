'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<{ email?: string }>({});

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value.includes('@') || value.length < email.length) {
            setEmail(value);
            if (errors.email) setErrors({});
            return;
        }

        if (/^\d{7,8}$/.test(value) && (value.length === 7 || value.length === 8)) {
            setEmail(value + '@horus.edu.eg');
            if (errors.email) setErrors({});
        } else {
            setEmail(value);
            if (errors.email) setErrors({});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'loading') return;

        const result = emailSchema.safeParse({ email });
        if (!result.success) {
            setErrors({ email: result.error.issues[0].message });
            return;
        }

        setStatus('loading');
        setMessage('');
        setErrors({});

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setStatus('success');
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to send reset link');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again later.');
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

                    <h1 className="mb-2 text-3xl font-medium tracking-tight text-white">Reset Password</h1>
                    <p className="mb-8 text-sm text-white/50">Enter your email to receive recovery instructions</p>

                    {status === 'success' ? (
                        <div className="space-y-6">
                            <div className="rounded-[10px] border border-emerald-400/25 bg-emerald-400/10 p-6 text-center">
                                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                                    <CheckCircle className="w-7 h-7" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-white">Check your email</h3>
                                <p className="text-sm leading-relaxed text-white/55">{message}</p>
                            </div>

                            <Link
                                href="/login"
                                className="group flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8C15A] py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76]"
                            >
                                Back to Sign In
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
                                <label className="mb-2 ml-1 block text-xs font-medium text-white/60">Email or ID</label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={handleEmailChange}
                                    inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                                    placeholder="Enter your email or Horus ID"
                                    className={`w-full rounded-[10px] border bg-[#0b0b0c] px-4 py-3.5 text-sm text-white placeholder-white/25 transition-colors focus:outline-none focus:ring-1 ${
                                        errors.email ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:border-[#E8C15A]/50 focus:ring-[#E8C15A]/30'
                                    }`}
                                    required
                                    dir="ltr"
                                />
                                {errors.email && <p role="alert" className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.email}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="group flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8C15A] py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    )}

                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-white/30 text-xs font-medium">
                            Remember your password?{' '}
                            <Link href="/login" className="inline-block py-2 text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/10 hover:decoration-[#E8C15A]/40">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-white/30 text-xs font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="inline-block py-2 text-[#E8C15A] hover:text-[#D59928] transition-colors font-bold underline underline-offset-4 decoration-[#E8C15A]/40">
                                Create one
                            </Link>
                        </p>
                    </div>

                    <div className="mt-12 text-center lg:hidden">
                        <Link href="/" className="inline-block py-3 text-xs text-white/50 transition-colors hover:text-white/80">
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

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/images/ui/pattern.svg')] opacity-[0.02] pointer-events-none" />

                <div className="max-w-xl relative">
                    <div className="mb-6 h-px w-16 bg-[#E8C15A]" />

                    <blockquote className="mb-12 text-3xl font-medium leading-tight tracking-tight text-white/90 xl:text-4xl">
                        &quot;Don&apos;t worry, we&apos;ve all been there. Reset your password and get back to <span className="text-[#E8C15A] italic font-bold">solving problems</span>.&quot;
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
