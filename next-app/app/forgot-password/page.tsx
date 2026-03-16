'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Hexagon, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
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

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Reset Password</h1>
                    <p className="text-white/40 text-sm mb-8">Enter your email to receive recovery instructions</p>

                    {status === 'success' ? (
                        <div className="space-y-6">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                                    <CheckCircle className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{message}</p>
                            </div>

                            <Link
                                href="/login"
                                className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                Back to Sign In
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
                                <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Email or ID</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your email or Horus ID"
                                    className={`w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all ${
                                        errors.email ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20'
                                    }`}
                                    required
                                    dir="ltr"
                                />
                                {errors.email && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.email}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    )}

                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-white/30 text-xs font-medium">
                            Remember your password?{' '}
                            <Link href="/login" className="text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/10 hover:decoration-[#E8C15A]/40">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-white/30 text-xs font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-[#E8C15A] hover:text-[#D59928] transition-colors font-bold underline underline-offset-4 decoration-[#E8C15A]/40">
                                Create one
                            </Link>
                        </p>
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/images/ui/pattern.svg')] opacity-[0.02] pointer-events-none" />

                <div className="max-w-xl relative">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />

                    <blockquote className="text-4xl text-white/90 font-medium leading-tight mb-12 tracking-tight">
                        &quot;Don&apos;t worry, we&apos;ve all been there. Reset your password and get back to <span className="text-[#E8C15A] italic font-bold">solving problems</span>.&quot;
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
