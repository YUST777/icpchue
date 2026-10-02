
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Hexagon, ArrowRight, Mail } from 'lucide-react';
import { z } from 'zod';

import { facultyOptions, levelOptions } from '@/app/register/constants';

const emailSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const passwordSchema = z.object({
    password: z.string()
        .min(9, 'Password must be at least 9 characters')
        .regex(/[A-Z]/, 'Password needs at least one uppercase letter'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type FormErrors = {
    email?: string;
    otp?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
    telephone?: string;
    faculty?: string;
    id?: string;
    nationalId?: string;
    studentLevel?: string;
    hasLaptop?: string;
    profiles?: string;
};

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Register() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [returningUserName, setReturningUserName] = useState<string | null>(null);

    // Step 1: Account
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 2: OTP
    const [otp, setOtp] = useState('');

    // Step 3: Trainee/Trainer Info
    const applicationType = 'trainee';
    const [formData, setFormData] = useState({
        name: '',
        telephone: '',
        faculty: '',
        id: '',
        nationalId: '',
        studentLevel: '',
        hasLaptop: '',
        codeforcesProfile: '',
        leetcodeProfile: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const otpInputRef = useRef<HTMLInputElement>(null);
    const isSubmittingRef = useRef(false);
    const { register: authRegister, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) router.replace('/dashboard');
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value.includes('@') || value.length < email.length) {
            setEmail(value);
            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
            return;
        }
        if (/^\d{7,8}$/.test(value) && (value.length === 7 || value.length === 8)) {
            setEmail(value + '@horus.edu.eg');
        } else {
            setEmail(value);
        }
        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue: string | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        if (name === 'id' || name === 'nationalId') {
            newValue = value.replace(/\D/g, '');
        }

        if (name === 'telephone') {
            newValue = value.replace(/[^\d+]/g, '');
            if (newValue && !newValue.startsWith('+20')) {
                if (newValue.startsWith('20')) {
                    newValue = '+' + newValue;
                } else if (newValue.startsWith('0')) {
                    newValue = '+20' + newValue.substring(1);
                } else if (!newValue.startsWith('+')) {
                    newValue = '+20' + newValue;
                }
            }
            if (typeof newValue === 'string' && newValue.length > 13) {
                newValue = newValue.substring(0, 13);
            }
        }

        setFormData(prev => ({ ...prev, [name]: newValue }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const sendOtp = async () => {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send code');
        return data;
    };

    const handleStep1Submit = async () => {
        const emailResult = emailSchema.safeParse({ email });
        const passResult = passwordSchema.safeParse({ password, confirmPassword });

        const newErrors: FormErrors = {};
        if (!emailResult.success) newErrors.email = emailResult.error.issues[0].message;
        if (!passResult.success) {
            passResult.error.issues.forEach(i => {
                newErrors[i.path[0] as keyof FormErrors] = i.message;
            });
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        isSubmittingRef.current = true;
        setSubmitError(null);
        setErrors({});
        setLoading(true);

        try {
            const data = await sendOtp();
            if (data.alreadyVerified) {
                // Email was already verified before — check if returning user
                await checkAndRouteReturningUser();
            } else {
                setResendCooldown(60);
                setStep(2);
                setTimeout(() => otpInputRef.current?.focus(), 100);
            }
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleStep2Submit = async () => {
        if (otp.length !== 6) {
            setErrors({ otp: 'Enter the 6-digit code' });
            return;
        }

        isSubmittingRef.current = true;
        setSubmitError(null);
        setErrors({});
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await res.json();

            if (!res.ok) {
                setSubmitError(data.error || 'Verification failed');
                return;
            }

            // OTP verified — check if returning user
            await checkAndRouteReturningUser();
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        setSubmitError(null);
        try {
            await sendOtp();
            setResendCooldown(60);
            setOtp('');
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Failed to resend');
        } finally {
            setLoading(false);
        }
    };

    const checkAndRouteReturningUser = async () => {
        try {
            const checkRes = await fetch('/api/auth/check-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const checkData = await checkRes.json();

            if (checkData.hasApplication) {
                // Returning user — skip form and create account directly
                setIsReturningUser(true);
                setReturningUserName(checkData.name);
                setLoading(true);
                try {
                    await authRegister({ email, password });
                    router.replace('/dashboard');
                } catch (err: any) {
                    setSubmitError(err.message || 'Registration failed');
                    setLoading(false);
                }
            } else {
                // New user — show the application form
                setStep(3);
            }
        } catch {
            // If check fails, fall back to showing the form
            setStep(3);
        }
    };

    const handleStep3Submit = async () => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.telephone.trim() || !/^\+20\d{10}$/.test(formData.telephone)) newErrors.telephone = 'Valid phone number is required (+20...)';
        if (!formData.faculty) newErrors.faculty = 'Faculty is required';
        if (!formData.id.trim() || formData.id.length < 7) newErrors.id = 'Valid student ID is required';
        if (formData.nationalId && formData.nationalId.length !== 14) newErrors.nationalId = 'National ID must be 14 digits';
        if (!formData.studentLevel) newErrors.studentLevel = 'Level is required';

        if (formData.hasLaptop === '') {
            newErrors.hasLaptop = 'Please select if you have a laptop';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        isSubmittingRef.current = true;
        setSubmitError(null);
        setErrors({});
        setLoading(true);

        const fullSubmissionData = {
            email,
            password,
            applicationType,
            ...formData,
        };

        try {
            await authRegister(fullSubmissionData);
            router.replace('/dashboard');
        } catch (err: any) {
            setSubmitError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;
        if (step === 1) await handleStep1Submit();
        else if (step === 2) await handleStep2Submit();
        else if (step === 3) await handleStep3Submit();
    };

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

    const inputBase = 'w-full px-3 sm:px-3.5 py-2 sm:py-2.5 bg-black/40 border rounded-xl text-white text-xs sm:text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const inputNormal = 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20';
    const inputError = 'border-red-500/50 focus:ring-red-500/50';

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <Image src="/icons/icpchue.svg" alt="Loading" fill className="animate-pulse" priority />
                </div>
            </div>
        );
    }

    const stepTitles = ['Start Your Application', 'Verify Email', 'Complete Profile'];
    const stepSubtitles = [
        '',
        'We sent a code to ' + email,
        "We need a little more info to get you set up.",
    ];

    return (
        <div dir="ltr" className="h-[100dvh] w-full bg-[#0A0A0A] flex flex-row-reverse overflow-hidden">
            {/* Right Side - Form */}
            <div className="w-full lg:w-[45%] h-[100dvh] flex flex-col justify-center px-5 sm:px-10 lg:px-12 xl:px-16 py-3 sm:py-4 bg-[#0C0C0C] relative overflow-y-auto lg:overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="w-full max-w-[440px] mx-auto z-10 flex flex-col justify-center my-auto">
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                        <Link href="/" aria-label="ICPC HUE home" className="inline-flex shrink-0 items-center hover:opacity-80 transition-opacity">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={26} height={26} className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain" priority />
                        </Link>
                        <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.14em] text-white/35 hover:text-[#E8C15A] transition-colors">
                            <span aria-hidden="true">&larr;</span> Back to home
                        </Link>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5 mb-2.5 sm:mb-3" aria-label={`Registration step ${step} of 3`}>
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-[#E8C15A]' : 'bg-white/5')} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                        <h1 className="whitespace-nowrap text-[16px] sm:text-[19px] font-bold leading-tight text-white tracking-tight">
                            {stepTitles[step - 1]}
                        </h1>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">Step 0{step}/03</span>
                    </div>
                    {stepSubtitles[step - 1] && (
                        <p className="text-white/40 text-[11px] sm:text-xs mb-2.5 sm:mb-3 line-clamp-1">
                            {stepSubtitles[step - 1]}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                        {submitError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-red-400 text-xs animate-shake">
                                {submitError}
                            </div>
                        )}

                        {/* ===== STEP 1: Email + Password ===== */}
                        {step === 1 && (
                            <div className="space-y-2.5 sm:space-y-3">
                                <div>
                                    <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Email or Horus ID</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="Enter your email or Horus ID"
                                        className={cn(inputBase, errors.email ? inputError : inputNormal)}
                                        dir="ltr"
                                    />
                                    {errors.email && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                                            placeholder="Min 9 characters, 1 uppercase"
                                            className={cn(inputBase, 'pr-10', errors.password ? inputError : inputNormal)}
                                            dir="ltr"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.password}</p>}
                                    {password && (
                                        <div className="mt-1.5">
                                            <div className="flex items-center justify-between text-[9px] mb-0.5 ml-1">
                                                <span className="text-white/30 uppercase tracking-wider">Strength</span>
                                                <span className={strength.pct >= 60 ? 'text-green-400' : 'text-white/40'}>{strength.label}</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1">
                                                <div className={cn('h-1 rounded-full transition-all', strength.color)} style={{ width: strength.pct + '%' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                                            placeholder="Re-enter your password"
                                            className={cn(inputBase, 'pr-10', errors.confirmPassword ? inputError : inputNormal)}
                                            dir="ltr"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>
                        )}

                        {/* ===== STEP 2: OTP Verification ===== */}
                        {step === 2 && (
                            <div className="space-y-2.5 sm:space-y-3">
                                <div>
                                    <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1.5 ml-1">
                                        <span className="flex items-center gap-1.5"><Mail size={12} /> Verification Code</span>
                                    </label>
                                    <input
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (errors.otp) setErrors(prev => ({ ...prev, otp: undefined })); }}
                                        placeholder="000000"
                                        className={cn(inputBase, 'text-center text-xl sm:text-2xl tracking-[0.4em] font-mono py-2.5', errors.otp ? inputError : inputNormal)}
                                        dir="ltr"
                                        autoComplete="one-time-code"
                                    />
                                    {errors.otp && <p className="text-red-400 text-[9px] mt-1 ml-1">{errors.otp}</p>}
                                    <div className="flex items-center justify-between mt-2 ml-1">
                                        <p className="text-white/20 text-[10px]">Check your inbox &amp; spam</p>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={resendCooldown > 0 || loading}
                                            className="text-[10px] font-bold text-[#E8C15A]/60 hover:text-[#E8C15A] disabled:text-white/10 transition-colors uppercase tracking-wider"
                                        >
                                            {resendCooldown > 0 ? ('Resend in ' + resendCooldown + 's') : 'Resend Code'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===== STEP 3: Profile / Application Info ===== */}
                        {step === 3 && (
                            <div className="space-y-2.5 sm:space-y-3">
                                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                    <div className="col-span-2">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            placeholder="John Doe"
                                            className={cn(inputBase, errors.name ? inputError : inputNormal)}
                                        />
                                        {errors.name && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.name}</p>}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Phone Number</label>
                                        <input
                                            type="text"
                                            name="telephone"
                                            value={formData.telephone}
                                            onChange={handleFormChange}
                                            placeholder="+20xxxxxxxxx"
                                            className={cn(inputBase, errors.telephone ? inputError : inputNormal)}
                                        />
                                        {errors.telephone && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.telephone}</p>}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Student ID</label>
                                        <input
                                            type="text"
                                            name="id"
                                            value={formData.id}
                                            onChange={handleFormChange}
                                            placeholder="82xxxxxx"
                                            maxLength={12}
                                            className={cn(inputBase, errors.id ? inputError : inputNormal)}
                                        />
                                        {errors.id && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.id}</p>}
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">National ID (Optional)</label>
                                        <input
                                            type="text"
                                            name="nationalId"
                                            value={formData.nationalId}
                                            onChange={handleFormChange}
                                            placeholder="14-digit Egyptian National ID"
                                            maxLength={14}
                                            className={cn(inputBase, errors.nationalId ? inputError : inputNormal)}
                                        />
                                        {errors.nationalId && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.nationalId}</p>}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Faculty</label>
                                        <select
                                            name="faculty"
                                            value={formData.faculty}
                                            onChange={handleFormChange}
                                            className={cn(inputBase, 'appearance-none', errors.faculty ? inputError : inputNormal)}
                                        >
                                            <option value="" className="bg-black">Select Faculty</option>
                                            {facultyOptions.map(opt => (
                                                <option key={opt.value} value={opt.value} className="bg-black">{opt.label.split(' / ')[0]}</option>
                                            ))}
                                        </select>
                                        {errors.faculty && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.faculty}</p>}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Level</label>
                                        <select
                                            name="studentLevel"
                                            value={formData.studentLevel}
                                            onChange={handleFormChange}
                                            className={cn(inputBase, 'appearance-none', errors.studentLevel ? inputError : inputNormal)}
                                        >
                                            <option value="" className="bg-black">Select Level</option>
                                            {levelOptions.map(opt => (
                                                <option key={opt.value} value={opt.value} className="bg-black">{opt.label.split(' / ')[0]}</option>
                                            ))}
                                        </select>
                                        {errors.studentLevel && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.studentLevel}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white/50 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ml-1">Do you have a laptop?</label>
                                    <div className="flex gap-2.5">
                                        <label className={cn(
                                            'flex-1 py-1.5 sm:py-2 px-3 rounded-xl cursor-pointer text-center text-xs font-semibold transition-all border',
                                            formData.hasLaptop === 'true' ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                        )}>
                                            <input type="radio" name="hasLaptop" value="true" checked={formData.hasLaptop === 'true'} onChange={handleFormChange} className="hidden" />
                                            Yes
                                        </label>
                                        <label className={cn(
                                            'flex-1 py-1.5 sm:py-2 px-3 rounded-xl cursor-pointer text-center text-xs font-semibold transition-all border',
                                            formData.hasLaptop === 'false' ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                        )}>
                                            <input type="radio" name="hasLaptop" value="false" checked={formData.hasLaptop === 'false'} onChange={handleFormChange} className="hidden" />
                                            No
                                        </label>
                                    </div>
                                    {errors.hasLaptop && <p className="text-red-400 text-[9px] mt-0.5 ml-1">{errors.hasLaptop}</p>}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (step === 2 && otp.length !== 6)}
                            className="w-full py-2.5 sm:py-3 mt-2 sm:mt-3 bg-[#E8C15A] hover:bg-[#D59928] text-black text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                step === 1 ? 'Send Verification Code' : step === 2 ? 'Verify Email' : 'Submit Application'
                            )}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
                        <p className="text-white/45 text-[11px] sm:text-xs font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/20 hover:decoration-[#E8C15A]/40">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Left Side - Branding */}
            <div className="hidden lg:flex w-[55%] h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-12 xl:px-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.05),transparent_50%)]" />

                <div className="max-w-xl relative">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />
                    <blockquote className="text-3xl xl:text-4xl text-white/90 font-medium leading-tight mb-8 tracking-tight">
                        &quot;Master algorithms, solve real challenges, and build your future in tech with <span className="text-[#E8C15A] italic font-bold">ICPC HUE</span>.&quot;
                    </blockquote>
                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-white/80 font-bold text-base tracking-tight">One Application, One Community</h4>
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">Horus University</p>
                    </div>
                </div>

                <div className="absolute bottom-8 left-12 right-12 xl:left-20 xl:right-20 flex items-center justify-between">
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
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
