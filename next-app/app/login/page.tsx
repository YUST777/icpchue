'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToasts } from '@/components/ui/toast';


import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import TutorialModal from '@/components/onboarding/TutorialModal';
import { InfiniteGrid } from '@/components/InfiniteGrid';

// Zod validation schema
const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Where to go after login: a ?redirect= path inside this site, else the dashboard. */
function postLoginPath(): string {
    if (typeof window === 'undefined') return '/dashboard';
    const target = new URLSearchParams(window.location.search).get('redirect') || '';
    // Same-site paths only ("/x", never "//host" or "/\\host"), so the link cannot send users elsewhere.
    return /^\/(?![/\\])/.test(target) ? target : '/dashboard';
}

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
            router.replace(postLoginPath());
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
            router.replace(postLoginPath());
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
            <div className="flex min-h-screen items-center justify-center bg-[#0b0b0c]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <Image src="/icons/icpchue.svg" alt="Loading" fill className="animate-pulse" />
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div dir="ltr" className="flex min-h-[100dvh] w-full flex-row-reverse bg-[#0b0b0c]">
            <TutorialModal isOpen={showTutorial} onClose={handleTutorialClose} />

            {/* Right Side - Form */}
            <div className="relative flex min-h-[100dvh] w-full flex-col justify-center bg-[#111214] px-6 py-10 sm:px-16 lg:w-[40%] lg:px-20 lg:py-12">

                <div className="w-full max-w-[400px] mx-auto z-10">
                    {/* Header */}
                    <div className="mb-10 lg:hidden">
                        <Link href="/" className="inline-block mb-6">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={48} height={48} className="w-12 h-12" />
                        </Link>
                    </div>

                    <h1 className="mb-2 text-3xl font-medium tracking-tight text-white">Focus &amp; Code</h1>
                    <p className="mb-8 text-sm text-white/50">Sign in to the ICPC HUE portal</p>

                    {/* Codeforces Login */}
                    <button
                        onClick={handleCodeforcesLogin}
                        className="group relative flex w-full items-center justify-center gap-3 rounded-[10px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                    >
                        <div className="relative h-5 w-5">
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
                    <div className="my-8 flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-xs text-white/35">or continue with email</span>
                        <div className="h-px flex-1 bg-white/10"></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {submitError && (
                            <div className="animate-shake rounded-[10px] border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-300">
                                {submitError}
                            </div>
                        )}

                        <div>
                            <label className="mb-2 ml-1 block text-xs font-medium text-white/60">Email or ID</label>
                            <input
                                type="text"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => validateField('email', email)}
                                inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                                placeholder="Enter your email or Horus ID"
                                className={`w-full rounded-[10px] border bg-[#0b0b0c] px-4 py-3.5 text-sm text-white placeholder-white/25 transition-colors focus:outline-none focus:ring-1 ${errors.email ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:border-[#E8C15A]/50 focus:ring-[#E8C15A]/30'
                                    }`}
                            />
                            {errors.email && <p role="alert" className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.email}</p>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2 ml-1">
                                <label className="text-xs font-medium text-white/60">Password</label>
                                <Link href="/forgot-password" className="text-xs text-[#E8C15A]/75 transition-colors hover:text-[#E8C15A]">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) validateField('password', e.target.value);
                                    }}
                                    onBlur={() => validateField('password', password)}
                                    placeholder="••••••••"
                                    className={`w-full rounded-[10px] border bg-[#0b0b0c] px-4 py-3.5 pr-12 text-sm text-white placeholder-white/25 transition-colors focus:outline-none focus:ring-1 ${errors.password ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:border-[#E8C15A]/50 focus:ring-[#E8C15A]/30'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p role="alert" className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8C15A] py-4 text-sm font-semibold text-black transition-colors hover:bg-[#F0CE76] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In Now'}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-white/30 text-xs font-medium">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="inline-block py-2 text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/10 hover:decoration-[#E8C15A]/40">
                                Create one
                            </Link>
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowTutorial(true)}
                            className="text-xs text-[#E8C15A]/65 transition-colors hover:text-[#E8C15A]"
                        >
                            Help: How to login?
                        </button>

                        <p className="text-white/20 text-[9px]">
                            By signing in, you agree to our{' '}
                            <Link href="/terms" className="underline hover:text-[#E8C15A]/60 transition-colors">Terms of Service</Link>
                        </p>
                    </div>

                    <div className="mt-12 text-center lg:hidden">
                        <Link href="/" className="inline-block py-3 text-xs text-white/50 transition-colors hover:text-white/80">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Left Side - Testimonial */}
            <div className="relative hidden min-h-[100dvh] w-[60%] items-center justify-center overflow-hidden border-r border-white/10 bg-[#0b0b0c] px-20 lg:flex">
                {/* Infinite Grid Background */}
                <InfiniteGrid />

                {/* Logo in Top Left Corner of the Left Side */}
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                        <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={40} height={40} className="h-10 w-10" />
                    </Link>
                </div>

                {/* Decorative Elements */}
                <div className="max-w-xl relative z-10">
                    <div className="mb-6 h-px w-16 bg-[#E8C15A]" />

                    {/* Quote */}
                    <blockquote className="mb-12 text-3xl font-medium leading-tight tracking-tight text-white/90 xl:text-4xl">
                        &quot;ICPC HUE is the bridge between <span className="text-[#E8C15A] italic">learning</span> and <span className="text-[#E8C15A] italic font-bold">mastery</span>. It&apos;s the platform I wish I had for my training.&quot;
                    </blockquote>

                    {/* Author Attribution */}
                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-base font-medium tracking-tight text-white/80">Yousef Dev</h4>
                        <p className="text-xs text-white/35">Co-Founder, ICPC HUE</p>
                    </div>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between z-10">
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
