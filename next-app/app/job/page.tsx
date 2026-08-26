'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Hexagon, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { InfiniteGrid } from '@/components/InfiniteGrid';
import { facultyOptions, levelOptions } from '@/app/register/constants';
import { committees, mediaSkills, tshirtSizes, weeklyHoursOptions } from '@/app/job/constants';

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

type FormErrors = Record<string, string | undefined>;

export default function JobApplicationPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [success, setSuccess] = useState(false);

    // Step 1: Personal info
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [faculty, setFaculty] = useState('');
    const [academicLevel, setAcademicLevel] = useState('');
    const [nationalId, setNationalId] = useState('');

    // Step 2: Committees
    const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);

    // Media fields
    const [selectedMediaSkills, setSelectedMediaSkills] = useState<string[]>([]);
    const [hasCamera, setHasCamera] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');

    // Mentor / Instructor shared
    const [codeforcesHandle, setCodeforcesHandle] = useState('');

    // Mentor fields
    const [contestExperience, setContestExperience] = useState('');
    const [weeklyAvailability, setWeeklyAvailability] = useState('');

    // Organizing fields
    const [hasEcpcTshirt, setHasEcpcTshirt] = useState('');
    const [tshirtSize, setTshirtSize] = useState('');
    const [campusDays, setCampusDays] = useState('');
    const [organizingExperience, setOrganizingExperience] = useState('');

    // Instructor fields
    const [preferredTeachingLevel, setPreferredTeachingLevel] = useState('');
    const [teachingExperience, setTeachingExperience] = useState('');

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);

    // --- Input styling constants (matches register/login theme) ---
    const inputBase = 'w-full px-4 py-3.5 bg-black/40 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const inputNormal = 'border-white/5 focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20';
    const inputError = 'border-red-500/50 focus:ring-red-500/50';
    const labelStyle = 'block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 ml-1';

    // --- Handlers ---
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value.includes('@') || value.length < email.length) {
            setEmail(value);
            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
            return;
        }
        if (/^\d{7,8}$/.test(value)) {
            setEmail(value + '@horus.edu.eg');
        } else {
            setEmail(value);
        }
        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^\d+]/g, '');
        if (value && !value.startsWith('+20')) {
            if (value.startsWith('20')) value = '+' + value;
            else if (value.startsWith('0')) value = '+20' + value.substring(1);
            else if (!value.startsWith('+')) value = '+20' + value;
        }
        if (value.length > 13) value = value.substring(0, 13);
        setPhone(value);
        if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
    };

    const toggleCommittee = (id: string) => {
        setSelectedCommittees(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
        if (errors.committees) setErrors(prev => ({ ...prev, committees: undefined }));
    };

    const toggleMediaSkill = (skill: string) => {
        setSelectedMediaSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    // --- Derived state ---
    const studentId = email.includes('@') ? email.split('@')[0] : '';
    const needsCfHandle = selectedCommittees.includes('mentor') || selectedCommittees.includes('instructor');

    // --- Validation ---
    const validateStep1 = (): boolean => {
        const newErrors: FormErrors = {};
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email is required';
        if (!phone.trim() || !/^\+20\d{10}$/.test(phone)) newErrors.phone = 'Valid phone number required (+20...)';
        if (!faculty) newErrors.faculty = 'Faculty is required';
        if (!academicLevel) newErrors.academicLevel = 'Level is required';
        if (nationalId && nationalId.length !== 14) newErrors.nationalId = 'National ID must be 14 digits';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }
        return true;
    };

    const validateStep2 = (): boolean => {
        const newErrors: FormErrors = {};
        if (selectedCommittees.length === 0) newErrors.committees = 'Select at least one committee';
        if (needsCfHandle && !codeforcesHandle.trim()) newErrors.codeforcesHandle = 'Codeforces Handle is required';
        if (selectedCommittees.includes('media') && selectedMediaSkills.length === 0) newErrors.mediaSkills = 'Select at least one skill';
        if (selectedCommittees.includes('instructor') && !preferredTeachingLevel) newErrors.preferredTeachingLevel = 'Select a teaching level';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }
        return true;
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;

        if (step === 1) {
            if (validateStep1()) {
                setErrors({});
                setSubmitError(null);
                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        if (!validateStep2()) return;

        isSubmittingRef.current = true;
        setSubmitError(null);
        setErrors({});
        setLoading(true);

        try {
            const res = await fetch('/api/job/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    studentId: studentId || email.split('@')[0],
                    phone: phone.trim(),
                    faculty,
                    academicLevel,
                    nationalId: nationalId.trim() || null,
                    committees: selectedCommittees,
                    mediaSkills: selectedMediaSkills,
                    hasCamera,
                    portfolioLink: portfolioLink.trim() || null,
                    codeforcesHandle: codeforcesHandle.trim() || null,
                    contestExperience: contestExperience.trim() || null,
                    weeklyAvailability: weeklyAvailability || null,
                    hasEcpcTshirt,
                    tshirtSize: tshirtSize || null,
                    campusDays: campusDays.trim() || null,
                    organizingExperience: organizingExperience.trim() || null,
                    preferredTeachingLevel: preferredTeachingLevel || null,
                    teachingExperience: teachingExperience.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setSubmitError(data.error || 'Something went wrong');
                return;
            }

            setSuccess(true);
        } catch {
            setSubmitError('فشل الاتصال بالسيرفر. حاول مرة أخرى.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    // ============================================================
    // SUCCESS SCREEN
    // ============================================================
    if (success) {
        return (
            <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A] flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-[#E8C15A]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={40} className="text-[#E8C15A]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Application Submitted!</h1>
                    <p className="text-white/40 text-sm leading-relaxed">
                        تم استلام طلبك بنجاح. سيتم مراجعة الطلب والتواصل معك قريباً على واتساب.
                    </p>
                    <div className="pt-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                        >
                            Back to Home
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // MAIN FORM
    // ============================================================
    return (
        <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A] flex flex-row-reverse">
            {/* ==================== RIGHT SIDE — FORM ==================== */}
            <div className="w-full lg:w-[45%] min-h-[100dvh] overflow-y-auto flex flex-col px-8 sm:px-16 lg:px-20 py-12 bg-[#0C0C0C] relative">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="w-full max-w-[450px] mx-auto z-10 pt-4 pb-10">
                    {/* Mobile logo */}
                    <div className="mb-8 lg:hidden">
                        <Link href="/" className="inline-block mb-4">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={48} height={48} className="h-12 w-auto" />
                        </Link>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-8">
                        {[1, 2].map((s) => (
                            <div key={s} className={cn('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-[#E8C15A]' : 'bg-white/5')} />
                        ))}
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {step === 1 ? 'Join the Team' : 'Choose Your Role'}
                    </h1>
                    <p className="text-white/40 text-sm mb-8">
                        {step === 1
                            ? 'Apply for a community role in ICPC HUE 2027.'
                            : 'Select one or more committees you want to join.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {submitError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-shake">
                                {submitError}
                            </div>
                        )}

                        {/* ============ STEP 1: Personal Info ============ */}
                        {step === 1 && (
                            <>
                                {/* Full Name */}
                                <div>
                                    <label className={labelStyle}>Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })); }}
                                        placeholder="Your full name"
                                        className={cn(inputBase, errors.name ? inputError : inputNormal)}
                                    />
                                    {errors.name && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.name}</p>}
                                </div>

                                {/* Email / Student ID */}
                                <div>
                                    <label className={labelStyle}>Email or Horus ID</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="Enter your email or Horus ID"
                                        className={cn(inputBase, errors.email ? inputError : inputNormal)}
                                        dir="ltr"
                                    />
                                    {errors.email && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.email}</p>}
                                </div>

                                {/* WhatsApp Phone */}
                                <div>
                                    <label className={labelStyle}>WhatsApp Phone</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="+201xxxxxxxxx"
                                        className={cn(inputBase, errors.phone ? inputError : inputNormal)}
                                        dir="ltr"
                                    />
                                    {errors.phone && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.phone}</p>}
                                </div>

                                {/* Faculty */}
                                <div>
                                    <label className={labelStyle}>Faculty</label>
                                    <select
                                        value={faculty}
                                        onChange={(e) => { setFaculty(e.target.value); if (errors.faculty) setErrors(prev => ({ ...prev, faculty: undefined })); }}
                                        className={cn(inputBase, 'appearance-none', errors.faculty ? inputError : inputNormal)}
                                    >
                                        <option value="" className="bg-black">Select your faculty</option>
                                        {facultyOptions.map(f => (
                                            <option key={f.value} value={f.value} className="bg-black">{f.label}</option>
                                        ))}
                                    </select>
                                    {errors.faculty && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.faculty}</p>}
                                </div>

                                {/* Academic Level */}
                                <div>
                                    <label className={labelStyle}>Academic Level</label>
                                    <div className="flex gap-2">
                                        {levelOptions.map(l => (
                                            <button
                                                key={l.value}
                                                type="button"
                                                onClick={() => { setAcademicLevel(l.value); if (errors.academicLevel) setErrors(prev => ({ ...prev, academicLevel: undefined })); }}
                                                className={cn(
                                                    'flex-1 p-3 rounded-xl cursor-pointer text-center text-sm font-semibold transition-all border',
                                                    academicLevel === l.value
                                                        ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                        : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                )}
                                            >
                                                {l.label.replace('Level ', 'L')}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.academicLevel && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.academicLevel}</p>}
                                </div>

                                {/* National ID (Optional) */}
                                <div>
                                    <label className={labelStyle}>
                                        National ID <span className="text-white/20">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={14}
                                        value={nationalId}
                                        onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, '')); if (errors.nationalId) setErrors(prev => ({ ...prev, nationalId: undefined })); }}
                                        placeholder="14-digit National ID"
                                        className={cn(inputBase, errors.nationalId ? inputError : inputNormal)}
                                        dir="ltr"
                                    />
                                    {errors.nationalId && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.nationalId}</p>}
                                </div>
                            </>
                        )}

                        {/* ============ STEP 2: Committee Selection + Dynamic Fields ============ */}
                        {step === 2 && (
                            <div className="space-y-6">
                                {/* Committee Cards — Multi-Select Grid */}
                                <div>
                                    <label className={labelStyle}>Select Committees</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {committees.map(c => {
                                            const isActive = selectedCommittees.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => toggleCommittee(c.id)}
                                                    className={cn(
                                                        'relative p-4 rounded-2xl border text-left transition-all group',
                                                        isActive
                                                            ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 shadow-lg shadow-[#E8C15A]/5'
                                                            : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/10'
                                                    )}
                                                >
                                                    <span className="text-2xl block mb-2">{c.emoji}</span>
                                                    <p className={cn('text-sm font-bold mb-0.5', isActive ? 'text-[#E8C15A]' : 'text-white/80')}>{c.name}</p>
                                                    <p className="text-[10px] text-white/30 font-semibold">{c.nameAr}</p>
                                                    <p className="text-[10px] text-white/20 mt-1.5 leading-relaxed">{c.description}</p>
                                                    {isActive && (
                                                        <div className="absolute top-3 right-3">
                                                            <CheckCircle size={16} className="text-[#E8C15A]" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.committees && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.committees}</p>}
                                </div>

                                {/* ---- Codeforces Handle (shared by mentor + instructor) ---- */}
                                {needsCfHandle && (
                                    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span className="text-[#E8C15A]">⚡</span> Competitive Programming
                                        </h3>
                                        <div>
                                            <label className={labelStyle}>Codeforces Handle</label>
                                            <input
                                                type="text"
                                                value={codeforcesHandle}
                                                onChange={(e) => { setCodeforcesHandle(e.target.value); if (errors.codeforcesHandle) setErrors(prev => ({ ...prev, codeforcesHandle: undefined })); }}
                                                placeholder="your_cf_handle"
                                                className={cn(inputBase, errors.codeforcesHandle ? inputError : inputNormal)}
                                                dir="ltr"
                                            />
                                            {errors.codeforcesHandle && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.codeforcesHandle}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* ---- Media Committee Details ---- */}
                                {selectedCommittees.includes('media') && (
                                    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span>🎨</span> Media Committee Details
                                        </h3>

                                        {/* Skills multi-select */}
                                        <div>
                                            <label className={labelStyle}>Your Skills</label>
                                            <div className="flex flex-wrap gap-2">
                                                {mediaSkills.map(skill => {
                                                    const isActive = selectedMediaSkills.includes(skill);
                                                    return (
                                                        <button
                                                            key={skill}
                                                            type="button"
                                                            onClick={() => toggleMediaSkill(skill)}
                                                            className={cn(
                                                                'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                                                                isActive
                                                                    ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                    : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                            )}
                                                        >
                                                            {skill}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {errors.mediaSkills && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.mediaSkills}</p>}
                                        </div>

                                        {/* Camera */}
                                        <div>
                                            <label className={labelStyle}>Do you own a camera?</label>
                                            <div className="flex gap-3">
                                                {['yes', 'no'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setHasCamera(opt)}
                                                        className={cn(
                                                            'flex-1 p-3 rounded-xl text-center text-sm font-semibold border transition-all',
                                                            hasCamera === opt
                                                                ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {opt === 'yes' ? 'Yes 📷' : 'No'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Portfolio */}
                                        <div>
                                            <label className={labelStyle}>
                                                Portfolio / Work Samples <span className="text-white/20">(Optional)</span>
                                            </label>
                                            <input
                                                type="url"
                                                value={portfolioLink}
                                                onChange={(e) => setPortfolioLink(e.target.value)}
                                                placeholder="Google Drive / Behance link"
                                                className={cn(inputBase, inputNormal)}
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ---- Mentor Committee Details ---- */}
                                {selectedCommittees.includes('mentor') && (
                                    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span>🧠</span> Mentorship Details
                                        </h3>

                                        <div>
                                            <label className={labelStyle}>
                                                Contest Experience <span className="text-white/20">(Optional)</span>
                                            </label>
                                            <textarea
                                                value={contestExperience}
                                                onChange={(e) => setContestExperience(e.target.value)}
                                                placeholder="ECPC participation, team name, achievements..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelStyle}>Weekly Availability</label>
                                            <div className="flex gap-2">
                                                {weeklyHoursOptions.map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setWeeklyAvailability(opt)}
                                                        className={cn(
                                                            'flex-1 p-3 rounded-xl text-center text-xs font-semibold border transition-all',
                                                            weeklyAvailability === opt
                                                                ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ---- Organizing Committee Details ---- */}
                                {selectedCommittees.includes('organizing') && (
                                    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span>👔</span> Organizing Details
                                        </h3>

                                        {/* ECPC Tshirt */}
                                        <div>
                                            <label className={labelStyle}>ECPC 2026 Participant / Has ECPC T-Shirt?</label>
                                            <div className="flex gap-3">
                                                {['yes', 'no'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setHasEcpcTshirt(opt)}
                                                        className={cn(
                                                            'flex-1 p-3 rounded-xl text-center text-sm font-semibold border transition-all',
                                                            hasEcpcTshirt === opt
                                                                ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {opt === 'yes' ? 'Yes 👕' : 'No'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* T-Shirt Size */}
                                        {hasEcpcTshirt === 'yes' && (
                                            <div>
                                                <label className={labelStyle}>T-Shirt Size</label>
                                                <div className="flex gap-2">
                                                    {tshirtSizes.map(s => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => setTshirtSize(s)}
                                                            className={cn(
                                                                'flex-1 p-3 rounded-xl text-center text-sm font-semibold border transition-all',
                                                                tshirtSize === s
                                                                    ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                    : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                            )}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Campus Days */}
                                        <div>
                                            <label className={labelStyle}>
                                                On-Campus Days <span className="text-white/20">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={campusDays}
                                                onChange={(e) => setCampusDays(e.target.value)}
                                                placeholder="e.g. Sun, Tue, Thu"
                                                className={cn(inputBase, inputNormal)}
                                            />
                                        </div>

                                        {/* Experience */}
                                        <div>
                                            <label className={labelStyle}>
                                                Previous Organizing Experience <span className="text-white/20">(Optional)</span>
                                            </label>
                                            <textarea
                                                value={organizingExperience}
                                                onChange={(e) => setOrganizingExperience(e.target.value)}
                                                placeholder="Events, student activities, conferences..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ---- Instructor Details ---- */}
                                {selectedCommittees.includes('instructor') && (
                                    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span>🎓</span> Instructor Details
                                        </h3>

                                        <div>
                                            <label className={labelStyle}>Preferred Teaching Level</label>
                                            <div className="flex gap-3">
                                                {['Level 1 (C++ Basics & STL)', 'Level 2 (DS & Algorithms)'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => { setPreferredTeachingLevel(opt); if (errors.preferredTeachingLevel) setErrors(prev => ({ ...prev, preferredTeachingLevel: undefined })); }}
                                                        className={cn(
                                                            'flex-1 p-3 rounded-xl text-center text-xs font-semibold border transition-all',
                                                            preferredTeachingLevel === opt
                                                                ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30'
                                                                : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.preferredTeachingLevel && <p className="text-red-400 text-[10px] mt-1.5 ml-1">{errors.preferredTeachingLevel}</p>}
                                        </div>

                                        <div>
                                            <label className={labelStyle}>
                                                Teaching Experience <span className="text-white/20">(Optional)</span>
                                            </label>
                                            <textarea
                                                value={teachingExperience}
                                                onChange={(e) => setTeachingExperience(e.target.value)}
                                                placeholder="Prior mentoring, workshops, sessions..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ---- Navigation & Submit Buttons ---- */}
                        <div className="flex gap-3 pt-2">
                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setSubmitError(null); setErrors({}); }}
                                    className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft size={16} />
                                    Back
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : step === 1 ? (
                                    'Next'
                                ) : (
                                    'Submit Application'
                                )}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-white/20 text-[10px]">
                            أي حد من أي كلية في حورس يقدر يقدم، حتى لو مش في الكوميونتي.
                        </p>
                    </div>

                    <div className="mt-6 text-center lg:hidden">
                        <Link href="/" className="text-[10px] uppercase font-bold tracking-widest text-white/10 hover:text-white/30 transition-colors">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* ==================== LEFT SIDE — BRANDING ==================== */}
            <div className="hidden lg:flex w-[55%] min-h-[100dvh] items-center justify-center bg-[#080808] border-r border-white/5 px-20 relative overflow-hidden">
                <InfiniteGrid />

                {/* Logo */}
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                        <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={40} height={40} className="w-10 h-10 drop-shadow-2xl" />
                    </Link>
                </div>

                {/* Radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,193,90,0.03),transparent_50%)]" />

                <div className="max-w-xl relative z-10">
                    <Hexagon size={64} className="text-[#E8C15A]/10 absolute -top-12 -left-12 rotate-12" />

                    <blockquote className="text-4xl text-white/90 font-medium leading-tight mb-12 tracking-tight">
                        &quot;Every great community is built by people who chose to <span className="text-[#E8C15A] italic">give</span> more than they <span className="text-[#E8C15A] italic font-bold">take</span>. Your role matters.&quot;
                    </blockquote>

                    <div className="space-y-0.5 ml-1">
                        <h4 className="text-white/80 font-bold text-base tracking-tight">ICPC HUE Community</h4>
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">Season 2027 — Join Us</p>
                    </div>
                </div>

                {/* Bottom */}
                <div className="absolute bottom-12 left-20 right-20 flex items-center justify-between z-10">
                    <p className="text-white/5 text-[9px] font-bold uppercase tracking-[0.2em]">&copy; 2027 HORUS UNIVERSITY</p>
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
