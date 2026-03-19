'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToasts } from '@/components/ui/toast';


import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Hexagon, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import TutorialModal from '@/components/onboarding/TutorialModal';
import { InfiniteGrid } from '@/components/InfiniteGrid';

// Zod validation schema
const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const [showTutorial, setShowTutorial] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Partial<LoginFormData>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isSubmittingRef = useRef(false);
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const toasts = useToasts();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, router]);

    // Handle search params for errors
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const error = params.get('error');
            const handle = params.get('handle');

            if (error === 'cf_not_linked') {
                toasts.message({
                    text: (
                        <span className="text-sm font-medium">
                            You must <Link href="/apply" className="text-[#E8C15A] underline decoration-[#E8C15A]/40 hover:decoration-[#E8C15A] transition-all font-bold">apply</Link> then <Link href="/register" className="text-[#E8C15A] underline decoration-[#E8C15A]/40 hover:decoration-[#E8C15A] transition-all font-bold">sign up</Link>
                        </span>
                    ),
                    preserve: true
                });
                // Clean URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } else if (error === 'oauth_failed') {
                setSubmitError('Codeforces login failed. Please try again.');
            }
        }
    }, []);

    // Check for tutorial on mount
    useEffect(() => {
        const hasSeen = localStorage.getItem('icpchue_login_tutorial_seen');
        if (!hasSeen) {
            const timer = setTimeout(() => setShowTutorial(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleTutorialClose = () => {
        localStorage.setItem('icpchue_login_tutorial_seen', 'true');
        setShowTutorial(false);
    };

    // Smart email auto-complete: detects student IDs and appends @horus.edu.eg
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value.includes('@') || value.length < email.length) {
            setEmail(value);
            if (errors.email) validateField('email', value);
            return;
        }

        if (/^\d{7,8}$/.test(value) && (value.length === 7 || value.length === 8)) {
            const autoEmail = value + '@horus.edu.eg';
            setEmail(autoEmail);
            if (errors.email) validateField('email', autoEmail);
        } else {
            setEmail(value);
            if (errors.email) validateField('email', value);
        }
    };

    const validateField = (field: keyof LoginFormData, value: string) => {
        try {
            loginSchema.shape[field].parse(value);
            setErrors(prev => ({ ...prev, [field]: undefined }));
        } catch (err) {
            if (err instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, [field]: err.issues[0].message }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            const fieldErrors: Partial<LoginFormData> = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof LoginFormData;
                fieldErrors[field] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        isSubmittingRef.current = true;
        setSubmitError(null);
        setErrors({});
        setLoading(true);

        try {
            await login(email, password);
            router.replace('/dashboard');
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Login failed');
            isSubmittingRef.current = false;
            setLoading(false);
        }
    };

    const handleCodeforcesLogin = () => {
        setLoading(true);
        window.location.href = '/api/auth/codeforces/login';
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <Image src="/icons/icpchue.svg" alt="Loading" fill className="animate-pulse" />
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A] flex flex-row-reverse">
            <TutorialModal isOpen={showTutorial} onClose={handleTutorialClose} />

            {/* Right Side - Form */}
            <div className="w-full lg:w-[40%] min-h-[100dvh] flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 bg-[#0C0C0C] relative">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="w-full max-w-[400px] mx-auto z-10">
                    {/* Header */}
                    <div className="mb-10 lg:hidden">
                        <Link href="/" className="inline-block mb-6">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={48} height={48} className="w-12 h-12" />
                        </Link>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Focus & Code</h1>
                    <p className="text-white/40 text-sm mb-8">Sign in to the ICPC HUE portal</p>

                    {/* Codeforces Login */}
                    <button
                        onClick={handleCodeforcesLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all group overflow-hidden relative shadow-lg shadow-black/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#E8C15A]/0 via-[#E8C15A]/5 to-[#E8C15A]/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="relative w-5 h-5 group-hover:scale-110 transition-transform">
                            <Image
                                src="/icons/Codeforces.colored.svg"
                                alt="CF"
                                fill
                                className="object-contain"
                            />
                        </div>
                        Continue with Codeforces
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/5"></div>
                        <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">or email login</span>
                        <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {submitError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-shake">
                                {submitError}
                            </div>
                        )}

                        <div>
                            <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Email or ID</label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => validateField('email', email)}
                                placeholder="Enter your email or Horus ID"
                                className={`w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all ${errors.email ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20'
                                    }`}
                            />
                            {errors.email && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.email}</p>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2 ml-1">
                                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Password</label>
                                <Link href="/forgot-password" className="text-[#E8C15A]/60 text-[10px] font-bold uppercase hover:text-[#E8C15A] transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) validateField('password', e.target.value);
                                    }}
                                    onBlur={() => validateField('password', password)}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all pr-12 ${errors.password ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In Now'}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-white/30 text-xs font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/10 hover:decoration-[#E8C15A]/40">
                                Create one
                            </Link>
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowTutorial(true)}
                            className="text-[10px] font-bold text-[#E8C15A]/40 hover:text-[#E8C15A]/80 uppercase tracking-widest transition-colors"
                        >
                            Help: How to login?
                        </button>
                    </div>

                    <div className="mt-12 text-center lg:hidden">
                        <Link href="/" className="text-[10px] uppercase font-bold tracking-widest text-white/10 hover:text-white/30 transition-colors">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Left Side - Testimonial */}
            <div className="hidden lg:flex w-[60%] min-h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-20 relative overflow-hidden">
                {/* Infinite Grid Background */}
                <InfiniteGrid />

                {/* Logo in Top Left Corner of the Left Side */}
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                        <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={40} height={40} className="w-10 h-10 drop-shadow-2xl" />
                    </Link>
                </div>

                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.03),transparent_50%)]" />

                <div className="max-w-xl relative z-10">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />

                    {/* Quote */}
                    <blockquote className="text-4xl text-white/90 font-medium leading-tight mb-12 tracking-tight">
                        &quot;ICPC HUE is the bridge between <span className="text-[#E8C15A] italic">learning</span> and <span className="text-[#E8C15A] italic font-bold">mastery</span>. It&apos;s the platform I wish I had for my training.&quot;
                    </blockquote>

                    {/* Author Attribution */}
                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-white/80 font-bold text-base tracking-tight">Yousef Dev</h4>
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">Co-Founder, ICPC HUE</p>
                    </div>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between z-10">
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
