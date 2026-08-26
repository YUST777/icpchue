'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowRight, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { facultyOptions, levelOptions } from '@/app/register/constants';
import { committees, mediaSkills, tshirtSizes, weeklyHoursOptions } from '@/app/job/constants';

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

type FormErrors = Record<string, string | undefined>;

export default function JobApplicationPage() {
    const [success, setSuccess] = useState(false);

    // Personal Info
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [faculty, setFaculty] = useState('');
    const [academicLevel, setAcademicLevel] = useState('');
    const [nationalId, setNationalId] = useState('');

    // Committee Selection (Multi-select)
    const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);

    // Media Fields
    const [selectedMediaSkills, setSelectedMediaSkills] = useState<string[]>([]);
    const [hasCamera, setHasCamera] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');

    // Codeforces Handle (Mentor & Instructor)
    const [codeforcesHandle, setCodeforcesHandle] = useState('');

    // Mentor Fields
    const [contestExperience, setContestExperience] = useState('');
    const [weeklyAvailability, setWeeklyAvailability] = useState('');

    // Organizing Fields
    const [hasEcpcTshirt, setHasEcpcTshirt] = useState('');
    const [tshirtSize, setTshirtSize] = useState('');
    const [campusDays, setCampusDays] = useState('');
    const [organizingExperience, setOrganizingExperience] = useState('');

    // Instructor Fields
    const [preferredTeachingLevel, setPreferredTeachingLevel] = useState('');
    const [teachingExperience, setTeachingExperience] = useState('');

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);

    // --- Styling Classes ---
    const cardBase = 'bg-[#111111]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl shadow-black/40 transition-all';
    const inputBase = 'w-full px-4 py-3.5 bg-black/50 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const inputNormal = 'border-white/[0.08] focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/30';
    const inputError = 'border-red-500/60 focus:ring-red-500/50';
    const labelStyle = 'block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 ml-1';

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
        if (errors.mediaSkills) setErrors(prev => ({ ...prev, mediaSkills: undefined }));
    };

    const studentId = email.includes('@') ? email.split('@')[0] : '';
    const needsCfHandle = selectedCommittees.includes('mentor') || selectedCommittees.includes('instructor');

    // --- Validation ---
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!name.trim()) newErrors.name = 'الاسم مطلوب';
        if (!email.trim() || !email.includes('@')) newErrors.email = 'البريد الجامعي غير صالح (@horus.edu.eg)';
        if (!phone.trim() || !/^\+20\d{10}$/.test(phone)) newErrors.phone = 'رقم الواتساب غير صالح (+201...)';
        if (!faculty) newErrors.faculty = 'يرجى اختيار الكلية';
        if (!academicLevel) newErrors.academicLevel = 'يرجى اختيار المستوى الدراسي';
        if (nationalId && nationalId.length !== 14) newErrors.nationalId = 'الرقم القومي يجب أن يتكون من 14 رقم';

        if (selectedCommittees.length === 0) {
            newErrors.committees = 'يرجى اختيار لجنة واحدة على الأقل للانضمام إليها';
        }

        if (needsCfHandle && !codeforcesHandle.trim()) {
            newErrors.codeforcesHandle = 'كود فورسس هاندل مطلوب لمراجعة خبرتك التنافسية';
        }

        if (selectedCommittees.includes('media') && selectedMediaSkills.length === 0) {
            newErrors.mediaSkills = 'يرجى اختيار مهارة واحدة على الأقل في لجنة الميديا';
        }

        if (selectedCommittees.includes('instructor') && !preferredTeachingLevel) {
            newErrors.preferredTeachingLevel = 'يرجى تحديد المستوى المفضل للتدريس';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstKey = Object.keys(newErrors)[0];
            const elem = document.getElementById(`field-${firstKey}`);
            if (elem) {
                elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return true;
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;

        if (!validateForm()) return;

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
                setSubmitError(data.error || 'حدث خطأ أثناء إرسال طلبك.');
                return;
            }

            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setSubmitError('فشل الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.');
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
            <div dir="ltr" className="min-h-screen w-full bg-[#0A0A0A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E8C15A]/5 rounded-full blur-[140px] pointer-events-none" />

                <div className="max-w-lg w-full text-center space-y-6 relative z-10 bg-[#111111] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
                    <div className="w-20 h-20 mx-auto bg-[#E8C15A]/10 border border-[#E8C15A]/30 rounded-full flex items-center justify-center">
                        <CheckCircle size={44} className="text-[#E8C15A]" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Application Received!</h1>
                        <p className="text-sm font-semibold text-[#E8C15A]">تم استلام طلب انضمامك بنجاح 🌟</p>
                    </div>

                    <p className="text-white/60 text-sm leading-relaxed" dir="rtl">
                        شكراً لرغبتك في المشاركة وبناء المجتمع لموسم 2027. سيقوم مسؤولو اللجان بمراجعة بياناتك والتواصل معك عبر الواتساب قريباً جداً.
                    </p>

                    <div className="pt-4 border-t border-white/10">
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
    // GOOGLE FORM STYLE — ONE BIG UNIFIED PAGE
    // ============================================================
    return (
        <div dir="ltr" className="min-h-screen w-full bg-[#0A0A0A] text-white relative selection:bg-[#E8C15A]/20 selection:text-[#E8C15A]">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#E8C15A]/[0.04] rounded-full blur-[160px]" />
                <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">

                {/* ================= HEADER CARD ================= */}
                <div className="bg-[#111111] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                    {/* Top Decorative Color Bar (Google Form Style) */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#E8C15A] via-[#F3D78A] to-[#E8C15A]" />

                    <div className="flex items-center justify-between gap-4 mb-6">
                        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                            <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={52} height={52} className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xl" />
                        </Link>
                        <span className="px-3.5 py-1.5 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20 text-[#E8C15A] text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                            <Sparkles size={14} /> Season 2027
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                        Join the <span className="text-[#E8C15A]">ICPC HUE</span> Team
                    </h1>

                    <blockquote className="text-white/70 text-base sm:text-lg italic font-medium leading-relaxed mb-4 border-l-2 border-[#E8C15A]/60 pl-4 py-0.5">
                        &ldquo;Every great community is built by people who chose to give more than they take. Your role matters.&rdquo;
                    </blockquote>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/[0.06] text-xs text-white/40">
                        <p className="font-semibold text-white/60">ICPC HUE Community &bull; Season 2027 — Join Us</p>
                        <p className="text-[#E8C15A]/80 font-medium" dir="rtl">متاح التقديم لأي طالب من أي كلية بحورس حتى لو بره الكوميونتي</p>
                    </div>
                </div>

                {/* ================= MAIN FORM CONTAINER ================= */}
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Global Submit Error Banner */}
                    {submitError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400 text-sm flex items-start gap-3 animate-shake">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">يرجى تصحيح الأخطاء التالية:</p>
                                <p className="text-xs text-red-300 mt-1">{submitError}</p>
                            </div>
                        </div>
                    )}

                    {/* ================= SECTION 1: PERSONAL INFO ================= */}
                    <div className={cardBase}>
                        <div className="mb-6 pb-4 border-b border-white/[0.06]">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-[#E8C15A]">01.</span> Personal & Academic Information
                            </h2>
                            <p className="text-xs text-white/40 mt-1">البيانات الأساسية للتواصل والتحقق الجامعي</p>
                        </div>

                        <div className="space-y-5">
                            {/* Full Name */}
                            <div id="field-name">
                                <label className={labelStyle}>
                                    Full Name <span className="text-[#E8C15A]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
                                    placeholder="الاسم ثلاثي أو رباعي بالعربي أو الإنجليزي"
                                    className={cn(inputBase, errors.name ? inputError : inputNormal)}
                                />
                                {errors.name && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.name}</p>}
                            </div>

                            {/* Email */}
                            <div id="field-email">
                                <label className={labelStyle}>
                                    University Email or Student ID <span className="text-[#E8C15A]">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your Horus ID (e.g. 8241043) or @horus.edu.eg"
                                    className={cn(inputBase, errors.email ? inputError : inputNormal)}
                                    dir="ltr"
                                />
                                <p className="text-[11px] text-white/30 mt-1.5 ml-1">
                                    💡 اكتب رقم الكارنيه فقط وسيتم كتابة @horus.edu.eg تلقائياً
                                </p>
                                {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
                            </div>

                            {/* WhatsApp Phone */}
                            <div id="field-phone">
                                <label className={labelStyle}>
                                    WhatsApp Phone Number <span className="text-[#E8C15A]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    placeholder="+20 1x xxxx xxxx"
                                    className={cn(inputBase, errors.phone ? inputError : inputNormal)}
                                    dir="ltr"
                                />
                                <p className="text-[11px] text-white/30 mt-1.5 ml-1">
                                    الرقم المستخدم للتواصل وإضافتك لجروب اللجان
                                </p>
                                {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>}
                            </div>

                            {/* Faculty + Academic Level */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div id="field-faculty">
                                    <label className={labelStyle}>
                                        Faculty / الكلية <span className="text-[#E8C15A]">*</span>
                                    </label>
                                    <select
                                        value={faculty}
                                        onChange={(e) => { setFaculty(e.target.value); if (errors.faculty) setErrors(p => ({ ...p, faculty: undefined })); }}
                                        className={cn(inputBase, 'appearance-none cursor-pointer', errors.faculty ? inputError : inputNormal)}
                                    >
                                        <option value="" className="bg-[#111]">Select your faculty</option>
                                        {facultyOptions.map(f => (
                                            <option key={f.value} value={f.value} className="bg-[#111]">{f.label}</option>
                                        ))}
                                    </select>
                                    {errors.faculty && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.faculty}</p>}
                                </div>

                                <div id="field-academicLevel">
                                    <label className={labelStyle}>
                                        Academic Level / المستوى <span className="text-[#E8C15A]">*</span>
                                    </label>
                                    <div className="flex gap-1.5">
                                        {levelOptions.map(l => (
                                            <button
                                                key={l.value}
                                                type="button"
                                                onClick={() => { setAcademicLevel(l.value); if (errors.academicLevel) setErrors(p => ({ ...p, academicLevel: undefined })); }}
                                                className={cn(
                                                    'flex-1 py-3.5 rounded-xl text-center text-xs sm:text-sm font-semibold border transition-all cursor-pointer',
                                                    academicLevel === l.value
                                                        ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40 shadow-sm'
                                                        : 'bg-black/40 border-white/[0.08] text-white/40 hover:bg-white/[0.04]'
                                                )}
                                            >
                                                {l.label.replace('Level ', 'L')}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.academicLevel && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.academicLevel}</p>}
                                </div>
                            </div>

                            {/* National ID */}
                            <div id="field-nationalId">
                                <label className={labelStyle}>
                                    National ID / الرقم القومي <span className="text-white/20 font-normal lowercase">(optional - للشهادات الرسمية)</span>
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={14}
                                    value={nationalId}
                                    onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, '')); if (errors.nationalId) setErrors(p => ({ ...p, nationalId: undefined })); }}
                                    placeholder="14-digit National ID (اختياري)"
                                    className={cn(inputBase, errors.nationalId ? inputError : inputNormal)}
                                    dir="ltr"
                                />
                                {errors.nationalId && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.nationalId}</p>}
                            </div>
                        </div>
                    </div>

                    {/* ================= SECTION 2: COMMITTEE SELECTION ================= */}
                    <div className={cardBase} id="field-committees">
                        <div className="mb-6 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-[#E8C15A]">02.</span> Choose Your Committee(s)
                                </h2>
                                <span className="text-xs text-[#E8C15A] font-semibold">Select 1 or more</span>
                            </div>
                            <p className="text-xs text-white/40 mt-1">تقدر تختار لجنة واحدة أو أكتر من لجنة في نفس الوقت</p>
                        </div>

                        {/* Committee Grid Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {committees.map(c => {
                                const isActive = selectedCommittees.includes(c.id);
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => toggleCommittee(c.id)}
                                        className={cn(
                                            'relative p-5 rounded-2xl border cursor-pointer select-none transition-all duration-200 group',
                                            isActive
                                                ? 'bg-[#E8C15A]/[0.08] border-[#E8C15A]/40 shadow-lg shadow-[#E8C15A]/5 scale-[1.01]'
                                                : 'bg-black/40 border-white/[0.08] hover:bg-white/[0.03] hover:border-white/20'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <span className="text-3xl block">{c.emoji}</span>
                                            <div className={cn(
                                                'w-6 h-6 rounded-lg border flex items-center justify-center transition-all',
                                                isActive
                                                    ? 'bg-[#E8C15A] border-[#E8C15A] text-black'
                                                    : 'border-white/20 bg-black/50 group-hover:border-white/40'
                                            )}>
                                                {isActive && <CheckCircle size={14} className="stroke-[3]" />}
                                            </div>
                                        </div>

                                        <h3 className={cn('text-base font-bold transition-colors', isActive ? 'text-[#E8C15A]' : 'text-white')}>
                                            {c.name}
                                        </h3>
                                        <p className="text-xs font-semibold text-white/40 mb-2">{c.nameAr}</p>
                                        <p className="text-xs text-white/50 leading-relaxed">{c.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.committees && <p className="text-red-400 text-xs mt-3 ml-1">{errors.committees}</p>}
                    </div>

                    {/* ================= SECTION 3: DYNAMIC COMMITTEE DETAILS ================= */}
                    {selectedCommittees.length > 0 && (
                        <div className="space-y-6">

                            {/* ---- Competitive Programming Shared Handle ---- */}
                            {needsCfHandle && (
                                <div className={cardBase} id="field-codeforcesHandle">
                                    <div className="mb-5 pb-3 border-b border-white/[0.06]">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span className="text-[#E8C15A]">⚡</span> Competitive Programming Verification
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">مطلوب لمراجعة خبرتك من قبل مهندسي الكوميونتي</p>
                                    </div>

                                    <div>
                                        <label className={labelStyle}>
                                            Codeforces Handle <span className="text-[#E8C15A]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={codeforcesHandle}
                                            onChange={(e) => { setCodeforcesHandle(e.target.value); if (errors.codeforcesHandle) setErrors(p => ({ ...p, codeforcesHandle: undefined })); }}
                                            placeholder="Enter your Codeforces handle"
                                            dir="ltr"
                                            className={cn(inputBase, errors.codeforcesHandle ? inputError : inputNormal)}
                                        />
                                        {errors.codeforcesHandle && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.codeforcesHandle}</p>}
                                    </div>
                                </div>
                            )}

                            {/* ---- Media Committee Section ---- */}
                            {selectedCommittees.includes('media') && (
                                <div className={cardBase} id="field-mediaSkills">
                                    <div className="mb-5 pb-3 border-b border-white/[0.06]">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span>🎨</span> Media Committee Details / تفاصيل الميديا
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">تصميم البوستات، الشهادات، شيكات الفيرست سولف، والتصوير</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className={labelStyle}>
                                                What skills do you have? / مهاراتك <span className="text-[#E8C15A]">*</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {mediaSkills.map(skill => {
                                                    const isSkillActive = selectedMediaSkills.includes(skill);
                                                    return (
                                                        <button
                                                            key={skill}
                                                            type="button"
                                                            onClick={() => toggleMediaSkill(skill)}
                                                            className={cn(
                                                                'px-4 py-3 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer flex items-center justify-between',
                                                                isSkillActive
                                                                    ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                    : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                            )}
                                                        >
                                                            <span>{skill}</span>
                                                            {isSkillActive && <CheckCircle size={14} className="shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {errors.mediaSkills && <p className="text-red-400 text-xs mt-2 ml-1">{errors.mediaSkills}</p>}
                                        </div>

                                        <div>
                                            <label className={labelStyle}>Do you own a camera? / معاك كاميرا احترافية؟</label>
                                            <div className="flex gap-3">
                                                {['yes', 'no'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setHasCamera(opt)}
                                                        className={cn(
                                                            'flex-1 p-3.5 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer',
                                                            hasCamera === opt
                                                                ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                        )}
                                                    >
                                                        {opt === 'yes' ? 'Yes, I have a camera 📷' : 'No camera'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelStyle}>
                                                Portfolio / Sample Works <span className="text-white/20 font-normal lowercase">(optional)</span>
                                            </label>
                                            <input
                                                type="url"
                                                value={portfolioLink}
                                                onChange={(e) => setPortfolioLink(e.target.value)}
                                                placeholder="Link to Google Drive / Behance / Facebook page"
                                                dir="ltr"
                                                className={cn(inputBase, inputNormal)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ---- Mentorship Committee Section ---- */}
                            {selectedCommittees.includes('mentor') && (
                                <div className={cardBase}>
                                    <div className="mb-5 pb-3 border-b border-white/[0.06]">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span>🧠</span> Mentorship Committee Details / تفاصيل المينتور
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">متابعة الفرق، حل مشاكلهم، والتنسيق مع الإنستراكتورز</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className={labelStyle}>
                                                Contest & Problem Solving Experience <span className="text-white/20 font-normal lowercase">(optional)</span>
                                            </label>
                                            <textarea
                                                value={contestExperience}
                                                onChange={(e) => setContestExperience(e.target.value)}
                                                placeholder="مشاركتك في مسابقات ECPC، مركزك، أسماء الفرق، الشيتات اللي حلتها..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelStyle}>Weekly Availability / ساعات التفرغ الأسبوعية</label>
                                            <div className="flex gap-2">
                                                {weeklyHoursOptions.map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setWeeklyAvailability(opt)}
                                                        className={cn(
                                                            'flex-1 p-3.5 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer',
                                                            weeklyAvailability === opt
                                                                ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ---- Organizing Committee Section ---- */}
                            {selectedCommittees.includes('organizing') && (
                                <div className={cardBase}>
                                    <div className="mb-5 pb-3 border-b border-white/[0.06]">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span>👔</span> Organizing Committee Details / تفاصيل التنظيم
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">تنظيم فعاليات الكوميونتي والإيفنتات والترحيب بالجدد</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className={labelStyle}>
                                                Did you participate in ECPC & have the official T-shirt? / شاركت في ECPC ومعاك التيشيرت؟
                                            </label>
                                            <div className="flex gap-3">
                                                {['yes', 'no'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setHasEcpcTshirt(opt)}
                                                        className={cn(
                                                            'flex-1 p-3.5 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer',
                                                            hasEcpcTshirt === opt
                                                                ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                        )}
                                                    >
                                                        {opt === 'yes' ? 'Yes, I have ECPC T-Shirt 👕' : 'No'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {hasEcpcTshirt === 'yes' && (
                                            <div>
                                                <label className={labelStyle}>T-Shirt Size / مقاس التيشيرت</label>
                                                <div className="flex gap-2">
                                                    {tshirtSizes.map(s => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => setTshirtSize(s)}
                                                            className={cn(
                                                                'flex-1 p-3.5 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer',
                                                                tshirtSize === s
                                                                    ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                    : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                            )}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className={labelStyle}>
                                                On-Campus Days / أيام تواجدك في الجامعة <span className="text-white/20 font-normal lowercase">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={campusDays}
                                                onChange={(e) => setCampusDays(e.target.value)}
                                                placeholder="مثال: الأحد، الثلاثاء، الخميس"
                                                className={cn(inputBase, inputNormal)}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelStyle}>
                                                Previous Organizing Experience <span className="text-white/20 font-normal lowercase">(optional)</span>
                                            </label>
                                            <textarea
                                                value={organizingExperience}
                                                onChange={(e) => setOrganizingExperience(e.target.value)}
                                                placeholder="خبرتك السابقة في تنظيم فعاليات، أسر طلابية، مؤتمرات..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ---- Instructor Section ---- */}
                            {selectedCommittees.includes('instructor') && (
                                <div className={cardBase} id="field-preferredTeachingLevel">
                                    <div className="mb-5 pb-3 border-b border-white/[0.06]">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span>🎓</span> Instructor Details / تفاصيل التدريب والشرح
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">شرح المسائل، الأساسيات، والخوارزميات للمتدربين</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className={labelStyle}>
                                                Preferred Level to Teach / المستوى المفضل للشرح <span className="text-[#E8C15A]">*</span>
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                {['Level 1 (C++ Basics & STL)', 'Level 2 (DS & Algorithms)'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => { setPreferredTeachingLevel(opt); if (errors.preferredTeachingLevel) setErrors(p => ({ ...p, preferredTeachingLevel: undefined })); }}
                                                        className={cn(
                                                            'flex-1 p-3.5 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer',
                                                            preferredTeachingLevel === opt
                                                                ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/40'
                                                                : 'bg-black/40 border-white/[0.08] text-white/50 hover:bg-white/[0.04]'
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.preferredTeachingLevel && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.preferredTeachingLevel}</p>}
                                        </div>

                                        <div>
                                            <label className={labelStyle}>
                                                Teaching & Mentoring Experience <span className="text-white/20 font-normal lowercase">(optional)</span>
                                            </label>
                                            <textarea
                                                value={teachingExperience}
                                                onChange={(e) => setTeachingExperience(e.target.value)}
                                                placeholder="خبرتك في الشرح، شرحت لزمايلك قبل كده؟ عندك أسلوب معين؟..."
                                                rows={3}
                                                className={cn(inputBase, inputNormal, 'resize-none')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* ================= SUBMIT ACTION CARD ================= */}
                    <div className={cn(cardBase, 'text-center')}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-xl shadow-[#E8C15A]/15 active:scale-[0.99] cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    جاري تسجيل طلبك...
                                </>
                            ) : (
                                <>
                                    Submit Application / إرسال الطلب
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <p className="text-xs text-white/40 mt-4 leading-relaxed" dir="rtl">
                            ملحوظة: مش لازم تكون بيرفكت، عادي لو لسا بتتعلم نعرف ندربك في اللجان لحد ما تبقى متمكن 🙌
                        </p>
                    </div>

                </form>

                {/* Footer Credits */}
                <footer className="text-center pt-8 pb-4 text-xs text-white/20 space-y-2">
                    <p>&copy; 2027 Horus University &bull; ICPC HUE Community</p>
                    <Link href="/" className="inline-block hover:text-white/40 transition-colors">
                        &larr; Back to ICPC HUE Portal
                    </Link>
                </footer>

            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
            `}</style>
        </div>
    );
}
