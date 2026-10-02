'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Hexagon, ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
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
    // Step 2: Level 0 handoff and account explanation
    // Step 3: Account Credentials (Email & Password)
    // Step 4: OTP Verification & Final Submit
    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [storySlide, setStorySlide] = useState(0);
    const [teamFrame, setTeamFrame] = useState(0);
    const [sessionFrame, setSessionFrame] = useState(0);
    const [winnerFrame, setWinnerFrame] = useState(0);
    const [storyReady, setStoryReady] = useState(false);
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

    // Account Credentials (Step 3)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP Code (Step 4)
    const [otp, setOtp] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const otpInputRef = useRef<HTMLInputElement>(null);
    const isSubmittingRef = useRef(false);
    const { register: authRegister, isAuthenticated } = useAuth();
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
        setWinnerFrame(0);
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
            setSessionFrame((current) => (current + 1) % 4);
        }, 1900);
        return () => window.clearInterval(timer);
    }, [step, storySlide]);

    useEffect(() => {
        if (step !== 0 || storySlide !== 2) return;
        const timer = window.setInterval(() => {
            setWinnerFrame((current) => (current + 1) % 5);
        }, 2400);
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

    // Step 1 Validation -> Save the training application and show the handoff
    const handleStep1Submit = async () => {
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

        isSubmittingRef.current = true;
        setErrors({});
        setSubmitError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/apply/level0', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'We could not save your registration.');
            setStep(2);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'We could not save your registration.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    // Step 3 Validation -> Send OTP -> Proceed to Step 4
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

    // Step 4 Validation -> Verify OTP & Submit
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
            registrationFlow: 'level0',
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
        if (step === 1) await handleStep1Submit();
        else if (step === 2) setStep(3);
        else if (step === 3) await handleStep2Submit();
        else if (step === 4) await handleStep3Submit();
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
        'FB_IMG_1790132657082.webp',
        'FB_IMG_1790132659885.webp',
        'FB_IMG_1790132664255.webp',
        'FB_IMG_1790132668477.webp',
        'FB_IMG_1790132683848.webp',
        'FB_IMG_1790132686754.webp',
        'FB_IMG_1790132690995.webp',
        'FB_IMG_1790132693865.webp',
        'FB_IMG_1790132696016.webp',
        'FB_IMG_1790132697858.webp',
        'FB_IMG_1790132699784.webp',
        'FB_IMG_1790132702043.webp',
        'FB_IMG_1790132703739.webp',
        'FB_IMG_1790132705475.webp',
        'FB_IMG_1790132707334.webp',
        'FB_IMG_1790132708823.webp',
    ].map((file) => `/icpchue_2026/apply/teams/${file}`);

    const sessionPhotos = [
        '657367962_122130414231113129_212038043814875684_n.jpg',
        '658157793_122130414285113129_3026927933477771579_n.jpg',
        '658173619_122130414147113129_4021898539307213542_n.jpg',
        '658797072_122130414189113129_8309544409391256141_n.jpg',
        '667386709_122131569639113129_4901110169865784213_n.jpg',
        '668353484_122131569807113129_2401607956113167475_n.jpg',
        '669603572_122131569633113129_554431543351382537_n.jpg',
        '669705997_122131569753113129_6657208219811454227_n.jpg',
        '698720073_122201950184480179_5524576068416986641_n.jpg',
        '698751636_122201950196480179_1317259686965926327_n.jpg',
        '698751641_122201950160480179_6892566794014720488_n (1).jpg',
        '698845343_122201950088480179_7433727580274268909_n.jpg',
        '700235973_122201950244480179_5384633379550818553_n.jpg',
        '701234639_122201950232480179_1041411884937013802_n.jpg',
        '701291046_122201950172480179_5707468508456741567_n.jpg',
        '701311673_122201950112480179_3810720953429366339_n.jpg',
    ].map((file) => `/icpchue_2026/sesstion/${file}`);

    const winnerPhotos = [
        '1_framed.JPG',
        '2_framed.JPG',
        'TOM08621_framed.JPG',
        'TOM08623_framed.JPG',
        'TOM08625_framed.JPG',
    ].map((file) => `/icpchue_2026/winners/${file}`);

    useEffect(() => {
        let mounted = true;
        const firstFrame = [
            '/icons/icpchue.svg',
            '/icpchue_2026/apply/teams/FB_IMG_1790132657082.webp',
            '/icpchue_2026/apply/teams/FB_IMG_1790132659885.webp',
            '/icpchue_2026/apply/teams/FB_IMG_1790132664255.webp',
            '/icpchue_2026/apply/teams/FB_IMG_1790132668477.webp',
        ];

        const imageReady = (src: string) => new Promise<void>((resolve) => {
            const image = new window.Image();
            image.decoding = 'async';
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = src;
        });

        Promise.all(firstFrame.map(imageReady)).then(() => {
            if (!mounted) return;
            window.requestAnimationFrame(() => setStoryReady(true));
        });

        const fallback = window.setTimeout(() => {
            if (mounted) setStoryReady(true);
        }, 5000);

        return () => {
            mounted = false;
            window.clearTimeout(fallback);
        };
    }, []);

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
            image: '/icpchue_2026/ecpc_qulifcatio/FB_IMG_1790132738501.jpg',
            alt: 'ICPC HUE members together at the ECPC qualification',
            kicker: 'A student community',
            title: 'ICPC HUE is where problem solvers meet.',
            body: 'We are Horus University students learning competitive programming together, one problem and one contest at a time.',
        },
        {
            kind: 'winners' as const,
            kicker: 'DCC 2026 · Community in motion',
            title: 'We build the room we want to compete in.',
            body: 'From our first community contest to the next qualification, every result is built by people showing up for one another.',
            images: winnerPhotos,
        },
        {
            kind: 'sessions' as const,
            kicker: 'Inside the sessions',
            title: 'The work happens together.',
            body: 'Level 0 is built around practice, feedback, and showing up consistently with people who want to improve.',
            images: sessionPhotos,
        },
    ] as const;

    const currentStory = storySlides[storySlide];
    const currentGallery = currentStory.kind === 'teams'
        ? currentStory.teams.slice(teamFrame * 4, teamFrame * 4 + 4)
        : currentStory.kind === 'sessions'
            ? currentStory.images.slice(sessionFrame * 4, sessionFrame * 4 + 4)
            : null;
    const currentWinner = currentStory.kind === 'winners' ? currentStory.images[winnerFrame] : null;
    const isPhotoStory = currentStory.kind === 'image' || currentStory.kind === 'winners';

    const inputBase = 'w-full px-3 py-1.5 sm:py-2 bg-black/40 border rounded-xl text-white text-xs sm:text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const inputNormal = 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20';
    const inputError = 'border-red-500/50 focus:ring-red-500/50';

    return (
        <div dir="ltr" className={cn('h-[100dvh] w-full overflow-hidden', step === 0 ? 'bg-black' : 'bg-[#0A0A0A] flex flex-row-reverse')}>
            <div
                role="status"
                aria-label="Loading ICPC HUE"
                aria-busy={!storyReady}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0b0b0a',
                    opacity: storyReady ? 0 : 1,
                    visibility: storyReady ? 'hidden' : 'visible',
                    pointerEvents: storyReady ? 'none' : 'auto',
                    transition: 'opacity 280ms ease, visibility 280ms ease',
                }}
            >
                <div style={{ position: 'relative', width: 86, height: 86, display: 'grid', placeItems: 'center' }}>
                    <Image
                        src="/icons/icpchue.svg"
                        alt=""
                        width="54"
                        height="54"
                        priority
                        unoptimized
                        style={{ width: 64, height: 64, objectFit: 'contain', animation: 'icpchue-loader-pulse 1100ms ease-in-out infinite' }}
                    />
                </div>
            </div>
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
                    {step > 0 && <div className={cn('flex items-center justify-between', step === 2 ? 'mb-3 sm:mb-4' : 'mb-6 sm:mb-7')}>
                        <Link href="/" aria-label="ICPC HUE home" className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={32} height={32} className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8" priority />
                        </Link>
                        {step === 2 && <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Level 0 · 2026/27</span>}
                    </div>}

                    {/* Account progress stays out of the way on the saved-registration handoff. */}
                    {step > 0 && step !== 2 && (
                        <>
                            <div className="flex items-center gap-1.5 mb-2" aria-label={`Account setup step ${step === 1 ? 1 : step === 3 ? 2 : 3} of 3`}>
                                {[1, 2, 3].map((s) => {
                                    const accountStep = step === 1 ? 1 : step === 3 ? 2 : 3;
                                    return <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', s <= accountStep ? 'bg-[#E8C15A]' : 'bg-white/5')} />;
                                })}
                            </div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <h1 className="text-[15px] font-bold leading-tight tracking-tight text-white sm:text-[18px]">
                                    {step === 1 ? 'Register for ICPC HUE Level 0' : step === 3 ? 'Create your ICPC HUE account' : 'Verify Email'}
                                </h1>
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">{step === 1 ? '1. Registration' : step === 3 ? '2. Account' : '3. Verify'}</span>
                            </div>
                            <p className="mb-2 text-[10.5px] text-white/40 sm:mb-2.5 sm:text-[11.5px]">
                                {step === 1 && 'Enter your student details for the Level 0 training cohort.'}
                                {step === 3 && 'Create the account you will use to train and track your progress.'}
                                {step === 4 && `We sent a 6-digit code to ${email}`}
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
                        <div className={cn('story-shell', isPhotoStory ? 'story-shell-photo' : 'story-shell-gallery')}>
                            <div className={cn('story-media', isPhotoStory ? 'story-media-photo' : 'story-media-gallery')} aria-live="polite">
                                {currentStory.kind === 'teams' || currentStory.kind === 'sessions' ? (
                                    <div className="story-gallery" key={`${currentStory.kind}-${currentStory.kind === 'teams' ? teamFrame : sessionFrame}`}>
                                        {currentGallery?.map((src, index) => (
                                            <div key={src} className={cn('story-photo team-tile relative', currentStory.kind === 'sessions' ? 'story-photo-session' : '')} style={{ animationDelay: `${index * 90}ms` }}>
                                                <Image
                                                    src={src}
                                                    alt={currentStory.kind === 'teams' ? `ICPC HUE ECPC team ${teamFrame * 4 + index + 1}` : `ICPC HUE community session ${sessionFrame * 4 + index + 1}`}
                                                    fill
                                                    priority={storySlide === 0 && teamFrame === 0}
                                                    loading={storySlide === 0 || storySlide === 3 ? 'eager' : 'lazy'}
                                                    quality={90}
                                                    sizes="50vw"
                                                    unoptimized={currentStory.kind === 'sessions'}
                                                    style={currentStory.kind === 'sessions' ? { transform: 'scale(1.18)', transformOrigin: 'center top' } : undefined}
                                                    className="object-cover object-center"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : currentStory.kind === 'winners' && currentWinner ? (
                                    <div className="story-winner-frame" key={currentWinner}>
                                        <Image
                                            src={currentWinner}
                                            alt={`ICPC HUE community winner photo ${winnerFrame + 1}`}
                                            fill
                                            priority={storySlide === 2 && winnerFrame === 0}
                                            loading={storySlide === 2 ? 'eager' : 'lazy'}
                                            quality={90}
                                            sizes="100vw"
                                            unoptimized
                                            style={{ transform: 'scale(1.24)', transformOrigin: 'center top' }}
                                            className="story-winner-image object-cover object-center"
                                        />
                                    </div>
                                ) : currentStory.kind === 'image' ? (
                                    <Image src={currentStory.image} alt={currentStory.alt} fill priority={storySlide === 1} loading={storySlide === 1 ? 'eager' : 'lazy'} quality={90} sizes="100vw" unoptimized style={{ transform: 'scale(1.3)', transformOrigin: 'center center', animation: 'none' }} className="story-feature-image object-cover object-center" />
                                ) : null}
                                <div className={isPhotoStory ? 'story-vignette' : 'story-gallery-shade'} />
                            </div>

                            <div className="story-progress" aria-label={`Community story ${storySlide + 1} of ${storySlides.length}`}>
                                {storySlides.map((slide, index) => (
                                    <button key={slide.kicker} type="button" aria-label={`Open story ${index + 1}`} onClick={() => setStorySlide(index)} className={cn('story-progress-segment', index <= storySlide ? 'is-active' : '')} style={{ minHeight: 4, height: 4, minWidth: 0, padding: 0 }} />
                                ))}
                            </div>

                            <Link href="/" aria-label="ICPC HUE home" className="story-logo absolute bottom-6 right-5 z-20 inline-flex h-10 w-10 items-center justify-center opacity-90 drop-shadow-[0_5px_15px_rgba(0,0,0,.5)] transition-transform duration-200 hover:scale-105 hover:opacity-100 sm:bottom-7 sm:right-7 sm:h-12 sm:w-12">
                                <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={52} height={52} priority className="h-full w-full object-contain" />
                            </Link>

                            <div className={cn('story-copy', isPhotoStory ? 'story-copy-photo' : 'story-copy-gallery')}>
                                <div className="story-kicker">
                                    <span className="story-rule" />
                                    <span>{currentStory.kind === 'teams' ? 'ECPC qualification · Team gallery' : currentStory.kind === 'sessions' ? 'Session moments' : currentStory.kicker}</span>
                                    {currentStory.kind === 'sessions' && <span className="story-season">ICPC HUE · 2026/27</span>}
                                </div>
                                <h1>{currentStory.title}</h1>
                                <p>{currentStory.body}</p>
                                <div className="story-actions">
                                    {storySlide > 0 && (
                                        <button type="button" onClick={() => setStorySlide((current) => current - 1)} className="story-secondary-cta">
                                            <ArrowLeft size={15} />
                                            <span>Previous</span>
                                        </button>
                                    )}
                                    <button type="button" onClick={() => storySlide < storySlides.length - 1 ? setStorySlide((current) => current + 1) : setStep(1)} className="story-cta">
                                        <span>{storySlide < storySlides.length - 1 ? 'Next story' : 'Register LV0'}</span>
                                        <ArrowRight size={15} />
                                    </button>
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

                            {/* ===== STEP 2: Level 0 handoff ===== */}
                            {step === 2 && (
                                <section className="handoff" aria-labelledby="level-zero-confirmation">
                                    <p className="handoff-eyebrow">ICPC HUE TRAINING</p>
                                    <h1 id="level-zero-confirmation" className="handoff-title">Your place is saved.</h1>
                                    <p className="handoff-lede">You’re on the Level 0 list. Choose how you want to continue.</p>

                                    <div className="handoff-routes">
                                        <div className="handoff-route handoff-route-primary">
                                            <div className="handoff-route-topline">
                                                <span className="handoff-route-label">Best way to train</span>
                                                <span className="handoff-route-badge">Recommended</span>
                                            </div>
                                            <div className="handoff-route-body">
                                                <div>
                                                    <h2>Create your ICPC HUE account</h2>
                                                    <p>Practice from 650+ problems, watch 22+ hours of sessions, and keep your progress in one place.</p>
                                                </div>
                                            </div>
                                            <div className="handoff-route-resources" aria-label="Training resources">
                                                <span><strong>650+</strong> problems</span>
                                                <span><strong>22+</strong> session hours</span>
                                                <span><strong>Progress</strong> saved</span>
                                            </div>
                                            <button type="submit" className="handoff-primary-button group">
                                                Create account
                                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                            </button>
                                        </div>

                                        <a
                                            href="https://chat.whatsapp.com/JreeORGikEY7J9I0UbcdOD?s=cl&p=a&ilr=4"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="handoff-route handoff-route-secondary"
                                            aria-label="Join the Level 0 WhatsApp group"
                                        >
                                            <div className="handoff-route-body">
                                                <div className="handoff-route-secondary-icon" aria-hidden="true"><FaWhatsapp size={36} /></div>
                                                <div>
                                                    <h2>Not ready for an account?</h2>
                                                    <p>Get Level 0 updates on WhatsApp.</p>
                                                </div>
                                                <span className="handoff-alternative-link" aria-hidden="true">
                                                    <span>Join</span>
                                                    <ArrowRight size={17} />
                                                </span>
                                            </div>
                                        </a>
                                    </div>
                                </section>
                            )}

                            {/* ===== STEP 3: Email & Password ===== */}
                            {step === 3 && (
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

                            {/* ===== STEP 4: OTP Verification ===== */}
                            {step === 4 && (
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
                            {step !== 2 && <button
                                type="submit"
                                disabled={loading || (step === 4 && otp.length !== 6)}
                                className="w-full py-2.5 sm:py-3 mt-1.5 bg-[#E8C15A] hover:bg-[#D59928] text-black text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="animate-spin" size={17} /> : (
                                    step === 1 ? 'Register for Level 0' : step === 3 ? 'Send verification code' : 'Verify email & submit'
                                )}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>}
                        </form>
                    )}

                </div>
            </div>

            {/* Left Side - Community Branding (Desktop) */}
            {step > 0 && <div className="hidden lg:flex w-[55%] h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-10 xl:px-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.05),transparent_50%)]" />

                <div className="max-w-xl relative">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs font-semibold mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Level 0 Training Cohort Now Open
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
                @keyframes icpchue-loader-pulse {
                    0%, 100% { opacity: .72; transform: scale(.94); }
                    50% { opacity: 1; transform: scale(1); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
                .handoff {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    margin-top: 10px;
                }
                .handoff-eyebrow {
                    margin: 0;
                    color: rgba(232,193,90,.9);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .2em;
                    line-height: 1.2;
                    text-transform: uppercase;
                }
                .handoff-title {
                    margin: 10px 0 0;
                    color: #fff;
                    font-size: clamp(32px, 3.4vw, 42px);
                    font-weight: 850;
                    letter-spacing: -.045em;
                    line-height: .98;
                    text-wrap: balance;
                }
                .handoff-lede {
                    max-width: 350px;
                    margin: 12px 0 25px;
                    color: rgba(255,255,255,.58);
                    font-size: 13px;
                    line-height: 1.45;
                }
                .handoff-routes {
                    border-top: 1px solid rgba(255,255,255,.15);
                    border-bottom: 1px solid rgba(255,255,255,.15);
                }
                .handoff-route {
                    min-width: 0;
                }
                .handoff-route-primary {
                    padding: 16px 0 18px;
                    border-bottom: 1px solid rgba(255,255,255,.1);
                }
                .handoff-route-topline {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .handoff-route-label,
                .handoff-route-badge {
                    color: rgba(232,193,90,.86);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: .15em;
                    line-height: 1.2;
                    text-transform: uppercase;
                }
                .handoff-route-badge {
                    padding: 5px 8px;
                    border: 1px solid rgba(232,193,90,.28);
                    border-radius: 999px;
                    color: rgba(255,255,255,.54);
                    font-size: 8px;
                    letter-spacing: .08em;
                }
                .handoff-route-body {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-top: 13px;
                }
                .handoff-route-primary .handoff-route-body > div:first-child {
                    flex: 1;
                    min-width: 0;
                }
                .handoff-route h2 {
                    margin: 0;
                    color: #fff;
                    font-size: 18px;
                    font-weight: 780;
                    letter-spacing: -.025em;
                    line-height: 1.12;
                }
                .handoff-route p {
                    max-width: 315px;
                    margin: 7px 0 0;
                    color: rgba(255,255,255,.53);
                    font-size: 11px;
                    line-height: 1.48;
                }
                .handoff-route-resources {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 7px 16px;
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,.1);
                    color: rgba(255,255,255,.42);
                    font-size: 9px;
                }
                .handoff-route-resources span { white-space: nowrap; }
                .handoff-route-resources strong {
                    margin-right: 3px;
                    color: rgba(255,255,255,.9);
                    font-size: 11px;
                    font-weight: 800;
                }
                .handoff-primary-button {
                    display: flex;
                    width: 100%;
                    min-height: 46px;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    margin-top: 16px;
                    padding: 12px 14px;
                    border: 0;
                    border-radius: 7px;
                    color: #15120c;
                    background: #e8c15a;
                    box-shadow: 0 10px 24px rgba(232,193,90,.14);
                    font-size: 12px;
                    font-weight: 800;
                    transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
                }
                .handoff-primary-button:hover {
                    background: #f2cf73;
                    box-shadow: 0 12px 28px rgba(232,193,90,.22);
                    transform: translateY(-1px);
                }
                .handoff-primary-button:focus-visible,
                .handoff-route-secondary:focus-visible {
                    outline: 2px solid #e8c15a;
                    outline-offset: 3px;
                }
                .handoff-route-secondary {
                    display: block;
                    padding: 16px 0 7px;
                    color: inherit;
                    text-decoration: none;
                    transition: background 180ms ease, transform 180ms ease;
                }
                .handoff-route-secondary:hover {
                    background: rgba(37,211,102,.045);
                    transform: translateX(2px);
                }
                .handoff-route-secondary .handoff-route-body {
                    align-items: center;
                    gap: 11px;
                    margin-top: 0;
                }
                .handoff-route-secondary .handoff-route-body > div:nth-child(2) {
                    flex: 1;
                    min-width: 0;
                }
                .handoff-route-secondary-icon {
                    display: grid;
                    flex: 0 0 auto;
                    width: 42px;
                    height: 42px;
                    place-items: center;
                    color: #25d366;
                }
                .handoff-route-secondary h2 {
                    font-size: 13px;
                    line-height: 1.2;
                }
                .handoff-route-secondary p {
                    margin-top: 4px;
                    font-size: 10px;
                    color: rgba(255,255,255,.4);
                }
                .handoff-alternative-link {
                    display: inline-flex;
                    flex: 0 0 auto;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    min-width: 50px;
                    height: 34px;
                    color: rgba(232,193,90,.88);
                    font-size: 10px;
                    font-weight: 800;
                    text-decoration: none;
                    transition: color 180ms ease;
                }
                .handoff-route-secondary:hover .handoff-alternative-link { color: #f2cf73; }
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
                    transform: scale(1.18);
                    transform-origin: center top;
                }
                .story-media > img {
                    animation: story-image-in 900ms cubic-bezier(.2,.75,.2,1) both;
                }
                .story-media > img.story-feature-image {
                    animation: story-feature-image-in 900ms cubic-bezier(.2,.75,.2,1) both;
                    transform-origin: center center;
                }
                .story-winner-frame {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    animation: story-image-in 900ms cubic-bezier(.2,.75,.2,1) both;
                }
                .story-winner-image {
                    object-position: center top !important;
                    transform: scale(1.24);
                    transform-origin: center top;
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
                    flex-wrap: wrap;
                    gap: 12px;
                    color: rgba(255,255,255,.78);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .16em;
                    line-height: 1.2;
                    text-transform: uppercase;
                }
                .story-rule { width: 30px; height: 1px; background: rgba(232,193,90,.8); }
                .story-season {
                    margin-left: auto;
                    color: rgba(255,255,255,.5);
                    font-size: 9px;
                    letter-spacing: .12em;
                    white-space: nowrap;
                }
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
                .story-secondary-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    border: 1px solid rgba(255,255,255,.18);
                    border-radius: 999px;
                    padding: 11px 14px;
                    background: rgba(255,255,255,.04);
                    color: rgba(255,255,255,.8);
                    font-size: 12px;
                    font-weight: 750;
                    transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
                }
                .story-secondary-cta:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.3); transform: translateY(-1px); }
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
                @keyframes story-feature-image-in { from { opacity: 0; transform: scale(1.3); } to { opacity: 1; transform: scale(1.3); } }
                .team-tile {
                    opacity: 0;
                    animation: team-reveal 700ms cubic-bezier(.2,.8,.2,1) forwards;
                    will-change: transform, opacity, filter;
                }
                @media (prefers-reduced-motion: reduce) {
                    .team-tile, .story-media > img { opacity: 1; animation: none; }
                }
                /* Keep the source artwork framed cleanly even when reduced motion is enabled. */
                .story-media > img.story-feature-image {
                    transform: scale(1.3) !important;
                    transform-origin: center center !important;
                    animation: none !important;
                }
                .story-winner-image {
                    transform: scale(1.24) !important;
                    transform-origin: center top !important;
                }
                .story-photo-session > img {
                    transform: scale(1.18) !important;
                    transform-origin: center top !important;
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
                    .handoff-title { font-size: 31px; }
                    .handoff { margin-top: 7px; }
                    .handoff-lede { margin-bottom: 22px; font-size: 12px; }
                    .handoff-route-primary { padding-top: 14px; }
                    .handoff-route h2 { font-size: 17px; }
                    .handoff-route p { font-size: 10.5px; }
                    .handoff-route-resources { gap: 7px 11px; }
                    .handoff-route-resources span { font-size: 8px; }
                    .handoff-route-resources strong { font-size: 10px; }
                    .handoff-route-badge { font-size: 7px; padding: 4px 7px; }
                    .story-copy { width: 100%; padding: 0 22px 24px; }
                    .story-copy h1 { max-width: 340px; margin-top: 13px; font-size: 34px; line-height: .98; }
                    .story-copy p { max-width: 340px; margin-top: 12px; font-size: 13px; line-height: 1.45; }
                    .story-actions { margin-top: 17px; gap: 11px; }
                    .story-secondary-cta { padding: 10px 12px; }
                    .story-cta { padding: 11px 15px 11px 16px; }
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
                    .story-copy-gallery .story-season { margin-left: 0; font-size: 7px; letter-spacing: .08em; }
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
