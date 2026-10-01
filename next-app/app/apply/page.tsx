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
};

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function ApplyPage() {
    // Step 0: Community Showcase & Intro
    // Step 1: Student Profile Info
    // Step 2: Account Credentials (Email & Password)
    // Step 3: OTP Verification & Final Submit
    const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
    const [storySlide, setStorySlide] = useState(0);
    const [teamFrame, setTeamFrame] = useState(0);
    const [sessionFrame, setSessionFrame] = useState(0);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [returningUserName, setReturningUserName] = useState<string | null>(null);

    // Profile Details (Step 1)
    const applicationType = 'trainee';
    const [formData, setFormData] = useState({
        name: '',
        telephone: '',
        faculty: '',
        id: '',
        nationalId: '',
        studentLevel: '',
        codeforcesProfile: '',
        leetcodeProfile: '',
    });

    // Account Credentials (Step 2)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP Code (Step 3)
    const [otp, setOtp] = useState('');

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

    useEffect(() => {
        setTeamFrame(0);
        setSessionFrame(0);
    }, [storySlide]);

    useEffect(() => {
        if (step !== 0 || storySlide !== 0) return;
        const timer = window.setInterval(() => {
            setTeamFrame((current) => (current + 1) % 4);
        }, 1900);
        return () => window.clearInterval(timer);
    }, [step, storySlide]);

    useEffect(() => {
        if (step !== 0 || storySlide !== 3) return;
        const timer = window.setInterval(() => {
            setSessionFrame((current) => (current + 1) % 2);
        }, 1900);
        return () => window.clearInterval(timer);
    }, [step, storySlide]);

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

    // Step 1 Validation -> Proceed to Step 2
    const handleStep1Submit = () => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Full name is required';
        if (!formData.telephone.trim() || !/^\+20\d{10}$/.test(formData.telephone)) newErrors.telephone = 'Valid phone is required (+20...)';
        if (!formData.faculty) newErrors.faculty = 'Faculty is required';
        if (!formData.id.trim() || formData.id.length < 7) newErrors.id = 'Valid student ID is required';
        if (!formData.nationalId.trim()) newErrors.nationalId = 'National ID is required';
        else if (formData.nationalId.length !== 14) newErrors.nationalId = 'Must be exactly 14 digits';
        else if (!/^[23]/.test(formData.nationalId)) newErrors.nationalId = 'Must start with 2 or 3';
        if (!formData.studentLevel) newErrors.studentLevel = 'Level is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setSubmitError(null);
        setStep(2);
    };

    // Step 2 Validation -> Send OTP -> Proceed to Step 3
    const handleStep2Submit = async () => {
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
                // Email was already verified before — proceed directly with registration
                await executeFinalRegistration();
            } else {
                setResendCooldown(60);
                setStep(3);
                setTimeout(() => otpInputRef.current?.focus(), 150);
            }
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    // Step 3 Validation -> Verify OTP & Submit
    const handleStep3Submit = async () => {
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

            // OTP verified — submit full registration
            await executeFinalRegistration();
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const executeFinalRegistration = async () => {
        const fullSubmissionData = {
            email,
            password,
            applicationType,
            registrationFlow: 'level1',
            ...formData,
        };

        try {
            await authRegister(fullSubmissionData);
            router.replace('/dashboard');
        } catch (err: any) {
            setSubmitError(err.message || 'Registration failed');
            setLoading(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;
        if (step === 1) handleStep1Submit();
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

    const teamPhotos = [
        'FB_IMG_1790132657082.jpg',
        'FB_IMG_1790132659885.jpg',
        'FB_IMG_1790132664255.jpg',
        'FB_IMG_1790132668477.jpg',
        'FB_IMG_1790132683848.jpg',
        'FB_IMG_1790132686754.jpg',
        'FB_IMG_1790132690995.jpg',
        'FB_IMG_1790132693865.jpg',
        'FB_IMG_1790132696016.jpg',
        'FB_IMG_1790132697858.jpg',
        'FB_IMG_1790132699784.jpg',
        'FB_IMG_1790132702043.jpg',
        'FB_IMG_1790132703739.jpg',
        'FB_IMG_1790132705475.jpg',
        'FB_IMG_1790132707334.jpg',
        'FB_IMG_1790132708823.jpg',
    ].map((file) => `/icpchue_2026/ecpc_qulifcatio/${file}`);

    const sessionPhotos = [
        '698720073_122201950184480179_5524576068416986641_n.jpg',
        '698751636_122201950196480179_1317259686965926327_n.jpg',
        '698751641_122201950160480179_6892566794014720488_n (1).jpg',
        '698845343_122201950088480179_7433727580274268909_n.jpg',
        '700235973_122201950244480179_5384633379550818553_n.jpg',
        '701234639_122201950232480179_1041411884937013802_n.jpg',
        '701291046_122201950172480179_5707468508456741567_n.jpg',
        '701311673_122201950112480179_3810720953429366339_n.jpg',
    ].map((file) => encodeURI(`/icpchue_2026/sesstion/clean/${file}`));

    const storySlides = [
        {
            kind: 'teams' as const,
            kicker: '16 teams · one community',
            title: 'Sixteen teams. One community.',
            body: 'This is ICPC HUE: students who show up, learn together, and carry each other into the contest room.',
            teams: teamPhotos,
        },
        {
            kind: 'image' as const,
            image: '/icpchue_2026/ecpc_qulifcatio/photo_2026-09-23_12-32-07.jpg',
            alt: 'ICPC HUE members together at the ECPC qualification',
            kicker: 'A student community',
            title: 'ICPC HUE is where problem solvers meet.',
            body: 'We are Horus University students learning competitive programming together, one problem and one contest at a time.',
        },
        {
            kind: 'image' as const,
            image: '/icpchue_2026/dcc/clean/FB_IMG_1790132765397.jpg',
            alt: 'ICPC HUE members celebrating at DCC 2026',
            kicker: 'Learn together',
            title: 'No one has to train alone.',
            body: 'Instructors explain. Mentors follow up. Teams practice, share ideas, and show up for each other when a problem gets hard.',
        },
        {
            kind: 'sessions' as const,
            kicker: 'Inside the sessions',
            title: 'The work happens together.',
            body: 'Level 1 is built around practice, feedback, and showing up consistently with people who want to improve.',
            images: sessionPhotos,
        },
    ] as const;

    const currentStory = storySlides[storySlide];
    const currentGallery = currentStory.kind === 'teams'
        ? currentStory.teams.slice(teamFrame * 4, teamFrame * 4 + 4)
        : currentStory.kind === 'sessions'
            ? currentStory.images.slice(sessionFrame * 4, sessionFrame * 4 + 4)
            : null;

    const inputBase = 'w-full px-3 py-1.5 sm:py-2 bg-black/40 border rounded-xl text-white text-xs sm:text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
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

    return (
        <div dir="ltr" className={cn('h-[100dvh] w-full overflow-hidden', step === 0 ? 'bg-black' : 'bg-[#0A0A0A] flex flex-row-reverse')}>
            {/* Form Column */}
            <div className={cn(
                'h-[100dvh] relative',
                step === 0
                    ? 'w-full overflow-hidden bg-black'
                    : 'w-full lg:w-[45%] flex flex-col justify-start lg:justify-center px-4 sm:px-8 lg:px-10 xl:px-14 pt-8 pb-3 sm:pt-10 lg:py-3 bg-[#0C0C0C] overflow-y-auto lg:overflow-hidden'
            )}>
                {step > 0 && <>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                </>}

                <div className={cn(
                    'z-10',
                    step === 0
                        ? 'w-full h-full flex flex-col'
                        : 'w-full max-w-[430px] mx-auto flex flex-col justify-center my-0 lg:my-auto'
                )}>

                    {/* Header Bar */}
                    {step > 0 && <div className="mb-6 flex items-center justify-between sm:mb-7">
                        <Link href="/" aria-label="ICPC HUE home" className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={32} height={32} className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8" priority />
                        </Link>
                    </div>}

                    {/* Step Indicator (only active in steps 1, 2, 3) */}
                    {step > 0 && (
                        <>
                            <div className="flex items-center gap-1.5 mb-2" aria-label={`Step ${step} of 3`}>
                                {[1, 2, 3].map((s) => (
                                    <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-[#E8C15A]' : 'bg-white/5')} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h1 className="whitespace-nowrap text-[15px] sm:text-[18px] font-bold leading-tight text-white tracking-tight">
                                    {step === 1 ? 'Complete Profile' : step === 2 ? 'Start Your Application' : 'Verify Email'}
                                </h1>
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">Step 0{step}/03</span>
                            </div>
                            <p className="text-white/40 text-[10.5px] sm:text-[11.5px] mb-2 sm:mb-2.5 line-clamp-1">
                                {step === 1 && 'Enter your university & personal identity details.'}
                                {step === 2 && 'Set up your secure login credentials.'}
                                {step === 3 && `We sent a 6-digit code to ${email}`}
                            </p>
                        </>
                    )}

                    {submitError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-red-400 text-xs mb-2 animate-shake">
                            {submitError}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 0: COMMUNITY SHOWCASE & INTRO CARD                  */}
                    {/* ========================================================= */}
                    {step === 0 && (
                        <div className={cn('story-shell', currentStory.kind === 'image' ? 'story-shell-photo' : 'story-shell-gallery')}>
                            <div className={cn('story-media', currentStory.kind === 'image' ? 'story-media-photo' : 'story-media-gallery')} aria-live="polite">
                                {currentStory.kind === 'teams' || currentStory.kind === 'sessions' ? (
                                    <div className="story-gallery" key={`${currentStory.kind}-${currentStory.kind === 'teams' ? teamFrame : sessionFrame}`}>
                                        {currentGallery?.map((src, index) => (
                                            <div key={src} className={cn('story-photo team-tile relative', currentStory.kind === 'sessions' ? 'story-photo-session' : '')} style={{ animationDelay: `${index * 90}ms` }}>
                                                <Image
                                                    src={src}
                                                    alt={currentStory.kind === 'teams' ? `ICPC HUE ECPC team ${teamFrame * 4 + index + 1}` : `ICPC HUE community session ${sessionFrame * 4 + index + 1}`}
                                                    fill
                                                    priority
                                                    sizes="(min-width: 1024px) 50vw, 50vw"
                                                    className="object-cover object-center"
                                                />
                                                <span className="story-photo-number">{String((currentStory.kind === 'teams' ? teamFrame : sessionFrame) * 4 + index + 1).padStart(2, '0')}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Image src={currentStory.image} alt={currentStory.alt} fill priority sizes="100vw" className="object-cover object-center" />
                                )}
                                <div className={currentStory.kind === 'image' ? 'story-vignette' : 'story-gallery-shade'} />
                            </div>

                            <div className="story-progress" aria-label={`Community story ${storySlide + 1} of ${storySlides.length}`}>
                                {storySlides.map((slide, index) => (
                                    <button key={slide.kicker} type="button" aria-label={`Open story ${index + 1}`} onClick={() => setStorySlide(index)} className={cn('story-progress-segment', index <= storySlide ? 'is-active' : '')} style={{ minHeight: 4, height: 4, minWidth: 0, padding: 0 }} />
                                ))}
                            </div>

                            <Link href="/" aria-label="ICPC HUE home" className="story-logo absolute bottom-6 right-5 z-20 inline-flex h-10 w-10 items-center justify-center opacity-90 drop-shadow-[0_5px_15px_rgba(0,0,0,.5)] transition-transform duration-200 hover:scale-105 hover:opacity-100 sm:bottom-7 sm:right-7 sm:h-12 sm:w-12">
                                <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={52} height={52} priority className="h-full w-full object-contain" />
                            </Link>

                            <div className={cn('story-copy', currentStory.kind !== 'image' ? 'story-copy-gallery' : 'story-copy-photo')}>
                                <div className="story-kicker">
                                    <span className="story-index">0{storySlide + 1}</span>
                                    <span className="story-rule" />
                                    <span>{currentStory.kind === 'teams' ? `ECPC qualification · Teams ${String(teamFrame * 4 + 1).padStart(2, '0')}–${String(teamFrame * 4 + 4).padStart(2, '0')}` : currentStory.kind === 'sessions' ? `Session moments · ${String(sessionFrame + 1).padStart(2, '0')} / 02` : currentStory.kicker}</span>
                                </div>
                                <h1>{currentStory.title}</h1>
                                <p>{currentStory.body}</p>
                                <div className="story-actions">
                                    <button type="button" onClick={() => storySlide < storySlides.length - 1 ? setStorySlide((current) => current + 1) : setStep(1)} className="story-cta">
                                        <span>{storySlide < storySlides.length - 1 ? 'Next story' : 'Start Level 1'}</span>
                                        <ArrowRight size={15} />
                                    </button>
                                    <span className="story-meta">ICPC HUE · 2026/27</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FORM CONTAINER (STEPS 1, 2, 3)                           */}
                    {/* ========================================================= */}
                    {step > 0 && (
                        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">

                            {/* ===== STEP 1: Student Profile Info ===== */}
                            {step === 1 && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                        <div className="col-span-2">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleFormChange}
                                                placeholder="e.g. Yousef Mohamed"
                                                className={cn(inputBase, errors.name ? inputError : inputNormal)}
                                            />
                                            {errors.name && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.name}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Phone Number</label>
                                            <input
                                                type="text"
                                                name="telephone"
                                                value={formData.telephone}
                                                onChange={handleFormChange}
                                                placeholder="+20xxxxxxxxx"
                                                className={cn(inputBase, errors.telephone ? inputError : inputNormal)}
                                            />
                                            {errors.telephone && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.telephone}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Student ID</label>
                                            <input
                                                type="text"
                                                name="id"
                                                value={formData.id}
                                                onChange={handleFormChange}
                                                placeholder="82xxxxxx"
                                                maxLength={12}
                                                className={cn(inputBase, errors.id ? inputError : inputNormal)}
                                            />
                                            {errors.id && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.id}</p>}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">National ID <span className="text-[#E8C15A]">*</span></label>
                                            <input
                                                type="text"
                                                name="nationalId"
                                                value={formData.nationalId}
                                                onChange={handleFormChange}
                                                placeholder="14-digit Egyptian National ID"
                                                maxLength={14}
                                                className={cn(inputBase, errors.nationalId ? inputError : inputNormal)}
                                            />
                                            {errors.nationalId && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.nationalId}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Faculty</label>
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
                                            {errors.faculty && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.faculty}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Academic Level</label>
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
                                            {errors.studentLevel && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.studentLevel}</p>}
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* ===== STEP 2: Email & Password ===== */}
                            {step === 2 && (
                                <div className="space-y-2 sm:space-y-2.5">
                                    <div>
                                        <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Email or Horus ID</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            placeholder="Enter your email or Horus ID"
                                            className={cn(inputBase, errors.email ? inputError : inputNormal)}
                                            dir="ltr"
                                        />
                                        {errors.email && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                                                placeholder="Min 9 characters, 1 uppercase"
                                                className={cn(inputBase, 'pr-9', errors.password ? inputError : inputNormal)}
                                                dir="ltr"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.password}</p>}
                                        {password && (
                                            <div className="mt-1">
                                                <div className="flex items-center justify-between text-[8.5px] mb-0.5 ml-1">
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
                                        <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                                                placeholder="Re-enter your password"
                                                className={cn(inputBase, 'pr-9', errors.confirmPassword ? inputError : inputNormal)}
                                                dir="ltr"
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {errors.confirmPassword && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.confirmPassword}</p>}
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 3: OTP Verification ===== */}
                            {step === 3 && (
                                <div className="space-y-2 sm:space-y-2.5">
                                    <div>
                                        <label className="block text-white/50 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1 ml-1">
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
                                            className={cn(inputBase, 'text-center text-xl sm:text-2xl tracking-[0.4em] font-mono py-2', errors.otp ? inputError : inputNormal)}
                                            dir="ltr"
                                            autoComplete="one-time-code"
                                        />
                                        {errors.otp && <p className="text-red-400 text-[8.5px] mt-0.5 ml-1">{errors.otp}</p>}
                                        <div className="flex items-center justify-between mt-1.5 ml-1">
                                            <p className="text-white/20 text-[9.5px]">Check inbox &amp; spam</p>
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                disabled={resendCooldown > 0 || loading}
                                                className="text-[9.5px] font-bold text-[#E8C15A]/70 hover:text-[#E8C15A] disabled:text-white/10 transition-colors uppercase tracking-wider"
                                            >
                                                {resendCooldown > 0 ? (`Resend in ${resendCooldown}s`) : 'Resend Code'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit / Next Button */}
                            <button
                                type="submit"
                                disabled={loading || (step === 3 && otp.length !== 6)}
                                className="w-full py-2.5 sm:py-3 mt-1.5 bg-[#E8C15A] hover:bg-[#D59928] text-black text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="animate-spin" size={17} /> : (
                                    step === 1 ? 'Continue to Account Setup' : step === 2 ? 'Send Verification Code' : 'Verify Email & Submit'
                                )}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    )}

                    {/* Bottom Link */}
                    {step > 0 && <div className="mt-2 sm:mt-2.5 text-center">
                        <p className="text-white/45 text-[10.5px] sm:text-xs font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white hover:text-[#E8C15A] transition-colors font-bold underline underline-offset-4 decoration-white/20 hover:decoration-[#E8C15A]/40">
                                Sign in
                            </Link>
                        </p>
                    </div>}

                </div>
            </div>

            {/* Left Side - Community Branding (Desktop) */}
            {step > 0 && <div className="hidden lg:flex w-[55%] h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-10 xl:px-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.05),transparent_50%)]" />

                <div className="max-w-xl relative">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-semibold mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Level 1 Training Cohort Now Open
                    </div>
                    <blockquote className="text-3xl xl:text-4xl text-white/90 font-medium leading-tight mb-8 tracking-tight">
                        &quot;Master algorithms, solve real challenges, and build your future in tech with <span className="text-[#E8C15A] italic font-bold">ICPC HUE</span>.&quot;
                    </blockquote>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                            <p className="text-2xl font-bold text-white tracking-tight">650+ Problems</p>
                            <p className="text-white/40 text-xs">Curated topic-wise sheets from Level 0 to 4</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white tracking-tight">+22 Hours</p>
                            <p className="text-white/40 text-xs">Recorded problem-solving camps &amp; live reviews</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 left-10 right-10 xl:left-16 xl:right-16 flex items-center justify-between">
                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-[0.2em]">&copy; 2026 HORUS UNIVERSITY • ICPC COMMUNITY</p>
                </div>
            </div>}

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
                @keyframes team-reveal {
                    0% { opacity: 0; transform: scale(0.84) translateY(10px); filter: saturate(0.4) brightness(0.55); }
                    65% { opacity: 1; transform: scale(1.035) translateY(-1px); filter: saturate(1.08) brightness(1.04); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: saturate(1) brightness(1); }
                }
                .story-shell {
                    position: relative;
                    height: 100%;
                    min-height: 0;
                    overflow: hidden;
                    isolation: isolate;
                    background: #0b0b0a;
                    color: #fff;
                }
                .story-media,
                .story-media > img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                }
                .story-media-gallery {
                    top: 0;
                    right: 0;
                    bottom: clamp(188px, 27vh, 230px);
                    left: 0;
                    width: auto;
                    height: auto;
                    padding: clamp(12px, 1.5vw, 24px);
                    background: #15120e;
                }
                .story-media-gallery .story-gallery {
                    gap: clamp(8px, 1vw, 16px);
                    padding: 0;
                }
                .story-media-gallery .story-photo {
                    border-radius: 4px;
                    box-shadow: 0 10px 32px rgba(0,0,0,.18);
                }
                .story-photo-session > img {
                    object-position: center top !important;
                }
                .story-media > img {
                    animation: story-image-in 900ms cubic-bezier(.2,.75,.2,1) both;
                }
                .story-gallery {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    grid-template-rows: repeat(2, minmax(0, 1fr));
                    gap: clamp(4px, 0.65vw, 10px);
                    padding: clamp(4px, 0.65vw, 10px);
                    background: #15120e;
                }
                .story-photo {
                    position: relative;
                    min-width: 0;
                    min-height: 0;
                    overflow: hidden;
                    background: #1a1712;
                }
                .story-photo::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: linear-gradient(135deg, rgba(255,255,255,.09), transparent 24%, transparent 75%, rgba(0,0,0,.18));
                    mix-blend-mode: screen;
                }
                .story-photo-number {
                    position: absolute;
                    left: 10px;
                    top: 9px;
                    z-index: 2;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .12em;
                    color: rgba(255,255,255,.84);
                    text-shadow: 0 1px 9px rgba(0,0,0,.8);
                }
                .story-vignette {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background:
                        linear-gradient(180deg, rgba(0,0,0,.34) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,.08) 52%, rgba(0,0,0,.76) 100%),
                        linear-gradient(90deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 52%);
                }
                .story-gallery-shade {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,0) 28%, rgba(0,0,0,.05));
                }
                .story-progress {
                    position: absolute;
                    inset: 18px 28px auto;
                    z-index: 20;
                    display: flex;
                    gap: 6px;
                }
                .story-progress-segment {
                    height: 4px;
                    min-width: 0;
                    flex: 1;
                    padding: 0;
                    border: 0;
                    border-radius: 999px;
                    background: rgba(255,255,255,.38);
                    transition: background 180ms ease, transform 180ms ease;
                }
                .story-progress-segment:hover { transform: scaleY(1.5); background: rgba(255,255,255,.75); }
                .story-progress-segment.is-active { background: #fff; }
                .story-logo {
                    position: absolute;
                    right: 28px;
                    bottom: 28px;
                    z-index: 20;
                    display: inline-flex;
                    width: 46px;
                    height: 46px;
                    align-items: center;
                    justify-content: center;
                    opacity: .92;
                    filter: drop-shadow(0 5px 15px rgba(0,0,0,.5));
                    transition: transform 180ms ease, opacity 180ms ease;
                }
                .story-logo:hover { opacity: 1; transform: translateY(-2px) scale(1.04); }
                .story-logo img { width: 100%; height: 100%; object-fit: contain; }
                .story-copy {
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    z-index: 10;
                    width: min(720px, 76%);
                    padding: 0 0 52px 52px;
                }
                .story-kicker {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: rgba(255,255,255,.78);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .16em;
                    line-height: 1.2;
                    text-transform: uppercase;
                }
                .story-index { color: #e8c15a; }
                .story-rule { width: 30px; height: 1px; background: rgba(232,193,90,.8); }
                .story-copy h1 {
                    max-width: 670px;
                    margin: 17px 0 0;
                    font-size: 62px;
                    font-weight: 850;
                    letter-spacing: -.045em;
                    line-height: .96;
                    text-wrap: balance;
                }
                .story-copy p {
                    max-width: 510px;
                    margin: 17px 0 0;
                    color: rgba(255,255,255,.78);
                    font-size: 15px;
                    line-height: 1.55;
                }
                .story-copy-gallery {
                    width: 100%;
                    height: clamp(188px, 27vh, 230px);
                    box-sizing: border-box;
                    padding: 18px 120px 20px 52px;
                    background: #0b0b0a;
                    border-top: 1px solid rgba(255,255,255,.09);
                }
                .story-copy-gallery h1 {
                    max-width: 760px;
                    margin-top: 9px;
                    font-size: clamp(27px, 3.2vw, 42px);
                    line-height: 1;
                    letter-spacing: -.035em;
                }
                .story-copy-gallery p {
                    max-width: 720px;
                    margin-top: 8px;
                    font-size: 13px;
                    line-height: 1.4;
                    color: rgba(255,255,255,.64);
                }
                .story-copy-gallery .story-actions {
                    margin-top: 13px;
                }
                .story-shell-gallery .story-logo {
                    right: 30px;
                    bottom: 20px;
                    width: 38px;
                    height: 38px;
                    opacity: .72;
                }
                .story-actions { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
                .story-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    border: 0;
                    border-radius: 999px;
                    padding: 12px 17px 12px 18px;
                    background: #e8c15a;
                    color: #15120c;
                    font-size: 12px;
                    font-weight: 800;
                    transition: transform 180ms ease, background 180ms ease;
                }
                .story-cta:hover { background: #f2cf73; transform: translateY(-1px); }
                .story-meta { color: rgba(255,255,255,.56); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
                @keyframes story-image-in { from { opacity: 0; transform: scale(1.035); } to { opacity: 1; transform: scale(1); } }
                .team-tile {
                    opacity: 0;
                    animation: team-reveal 700ms cubic-bezier(.2,.8,.2,1) forwards;
                    will-change: transform, opacity, filter;
                }
                @media (prefers-reduced-motion: reduce) {
                    .team-tile, .story-media > img { opacity: 1; animation: none; }
                }
                @media (max-width: 1023px) {
                    .story-copy { width: min(720px, 90%); padding: 0 0 34px 28px; }
                    .story-copy h1 { font-size: 44px; }
                    .story-copy p { max-width: 470px; font-size: 14px; }
                    .story-logo { right: 22px; bottom: 24px; width: 42px; height: 42px; }
                    .story-progress { inset: 15px 18px auto; }
                    .story-copy-gallery { padding: 16px 92px 18px 28px; }
                    .story-copy-gallery h1 { font-size: 32px; }
                    .story-copy-gallery p { font-size: 12.5px; }
                    .story-shell-gallery .story-logo { right: 24px; bottom: 18px; width: 36px; height: 36px; }
                }
                @media (max-width: 640px) {
                    .story-copy { width: 100%; padding: 0 22px 24px; }
                    .story-copy h1 { max-width: 340px; margin-top: 13px; font-size: 34px; line-height: .98; }
                    .story-copy p { max-width: 340px; margin-top: 12px; font-size: 13px; line-height: 1.45; }
                    .story-actions { margin-top: 17px; gap: 11px; }
                    .story-cta { padding: 11px 15px 11px 16px; }
                    .story-meta { font-size: 8px; letter-spacing: .1em; }
                    .story-logo { right: 18px; bottom: 25px; width: 36px; height: 36px; }
                    .story-photo-number { left: 7px; top: 6px; font-size: 8px; }
                    .story-media-gallery {
                        bottom: 205px;
                        padding: 9px;
                    }
                    .story-media-gallery .story-gallery { gap: 7px; }
                    .story-copy-gallery {
                        height: 205px;
                        padding: 14px 68px 16px 18px;
                    }
                    .story-copy-gallery .story-kicker { gap: 8px; font-size: 8px; letter-spacing: .12em; }
                    .story-copy-gallery h1 { margin-top: 7px; font-size: 25px; line-height: 1.02; }
                    .story-copy-gallery p { margin-top: 7px; font-size: 11.5px; line-height: 1.35; }
                    .story-copy-gallery .story-actions { margin-top: 10px; }
                    .story-shell-gallery .story-logo { right: 17px; bottom: 18px; width: 31px; height: 31px; }
                }
                ::-webkit-scrollbar {
                    width: 4px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
