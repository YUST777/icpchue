'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Loader2,
    ArrowRight,
    CheckCircle2,
    Palette,
    Users,
    CalendarCheck,
    GraduationCap,
    Camera,
    Shirt,
    Trophy,
} from 'lucide-react';
import { facultyOptions, levelOptions } from '@/app/register/constants';
import { committees, mediaSkills } from '@/app/job/constants';

function cn(...c: (string | boolean | undefined)[]) {
    return c.filter(Boolean).join(' ');
}

type FormErrors = Record<string, string | undefined>;

const getCommitteeIcon = (id: string, className?: string) => {
    const cls = className || "text-[#E8C15A]";
    switch (id) {
        case 'media':
            return <Palette size={18} className={cls} />;
        case 'mentor':
            return <Users size={18} className={cls} />;
        case 'organizing':
            return <CalendarCheck size={18} className={cls} />;
        case 'instructor':
            return <GraduationCap size={18} className={cls} />;
        default:
            return null;
    }
};

export default function JobApplicationPage() {
    // Step 1: Personal Info
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [faculty, setFaculty] = useState('');
    const [academicLevel, setAcademicLevel] = useState('');
    const [nationalId, setNationalId] = useState('');

    // Step 2: Committees (Multi-Select)
    const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<string>('media');

    // Media
    const [selectedMediaSkills, setSelectedMediaSkills] = useState<string[]>([]);
    const [hasCamera, setHasCamera] = useState('');

    // Codeforces (Mentor / Instructor)
    const [codeforcesHandle, setCodeforcesHandle] = useState('');

    // Mentor
    const [participatedEcpc, setParticipatedEcpc] = useState('');
    const [contestExperience, setContestExperience] = useState('');

    // Organizing
    const [hasEcpcTshirt, setHasEcpcTshirt] = useState('');
    const [organizingExperience, setOrganizingExperience] = useState('');

    // Instructor
    const [preferredTeachingLevel, setPreferredTeachingLevel] = useState('');
    const [teachingExperience, setTeachingExperience] = useState('');

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Compact styling for zoomed-out zero-scroll layout (text-sm on mobile prevents iOS Safari auto-zoom & enhances legibility)
    const iB = 'w-full px-3.5 py-2.5 sm:py-2 bg-[#1A1A1E] border rounded-lg text-white text-sm sm:text-xs placeholder-white/40 focus:outline-none focus:ring-1 transition-all';
    const iN = 'border-white/10 focus:ring-[#E8C15A]/60 focus:border-[#E8C15A]/50';
    const iE = 'border-red-500/70 focus:ring-red-500/60';
    const labelStyle = 'block text-white font-semibold text-xs sm:text-[11px] uppercase tracking-wider mb-1.5 ml-0.5';

    // Normalize Eastern Arabic numerals (٠-٩) to ASCII numerals (0-9)
    const toAsciiDigits = (str: string) => {
        return (str || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    };

    const handleEmail = (val: string) => {
        const ascii = toAsciiDigits(val);
        const clean = ascii.replace(/@horus\.edu\.eg$/i, '').replace(/\D/g, '').slice(0, 10);
        setEmail(clean);
        if (errors.email) setErrors(p => { const c = { ...p }; delete c.email; return c; });
        if (submitError) setSubmitError(null);
    };

    const handlePhone = (val: string) => {
        let digits = toAsciiDigits(val).replace(/\D/g, '');
        if (digits.startsWith('0020')) digits = digits.slice(4);
        else if (digits.startsWith('20') && digits.length > 10) digits = digits.slice(2);
        setPhone(digits.slice(0, 11));
        if (errors.phone) setErrors(p => { const c = { ...p }; delete c.phone; return c; });
        if (submitError) setSubmitError(null);
    };

    const handleNationalId = (val: string) => {
        const digits = toAsciiDigits(val).replace(/\D/g, '').slice(0, 14);
        setNationalId(digits);
        if (errors.nationalId) setErrors(p => { const c = { ...p }; delete c.nationalId; return c; });
        if (submitError) setSubmitError(null);
    };

    const handleCodeforces = (val: string) => {
        const clean = val.replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//i, '').replace(/\/$/, '').trim();
        setCodeforcesHandle(clean);
        if (errors.codeforcesHandle) setErrors(p => { const c = { ...p }; delete c.codeforcesHandle; return c; });
        if (submitError) setSubmitError(null);
    };

    const toggleCommittee = (id: string) => {
        setSelectedCommittees(p => {
            const next = p.includes(id) ? p.filter(c => c !== id) : [...p, id];
            if (!next.includes(activeTab) && next.length > 0) {
                setActiveTab(next[0]);
            }
            return next;
        });
        if (errors.committees) setErrors(p => { const c = { ...p }; delete c.committees; return c; });
        if (submitError) setSubmitError(null);
    };

    const toggleMediaSkill = (skill: string) => {
        setSelectedMediaSkills(p => p.includes(skill) ? p.filter(s => s !== skill) : [...p, skill]);
        if (errors.mediaSkills) setErrors(p => { const c = { ...p }; delete c.mediaSkills; return c; });
        if (submitError) setSubmitError(null);
    };

    const currentTab = selectedCommittees.includes(activeTab)
        ? activeTab
        : (selectedCommittees[0] || 'media');

    const needsCf = selectedCommittees.includes('mentor') || selectedCommittees.includes('instructor');

    const validate = () => {
        const e: FormErrors = {};
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 3) {
            e.name = 'Full name is required (at least 3 characters)';
        }

        const trimmedEmail = toAsciiDigits(email).trim().replace(/@horus\.edu\.eg$/i, '').replace(/\D/g, '');
        if (!trimmedEmail) {
            e.email = 'Horus ID is required';
        } else if (!/^\d{7,10}$/.test(trimmedEmail)) {
            e.email = 'Enter valid 7-10 digit Horus ID';
        }

        let digitsPhone = toAsciiDigits(phone).replace(/\D/g, '');
        if (digitsPhone.startsWith('0020')) digitsPhone = digitsPhone.slice(4);
        else if (digitsPhone.startsWith('20') && digitsPhone.length > 10) digitsPhone = digitsPhone.slice(2);
        const normalizedPhone = digitsPhone.startsWith('0') ? digitsPhone.slice(1) : digitsPhone;

        if (!normalizedPhone || !/^1[0125]\d{8}$/.test(normalizedPhone)) {
            e.phone = 'Valid Egyptian mobile required (01xxxxxxxxx)';
        }

        if (!faculty) e.faculty = 'Faculty required';
        if (!academicLevel) e.academicLevel = 'Level required';

        const cleanNid = toAsciiDigits(nationalId).replace(/\D/g, '');
        if (!cleanNid || !/^[23]\d{13}$/.test(cleanNid)) {
            e.nationalId = '14-digit National ID starting with 2 or 3';
        }

        if (selectedCommittees.length === 0) e.committees = 'Select at least one committee';
        if (needsCf && !codeforcesHandle.trim()) e.codeforcesHandle = 'Codeforces handle is required';
        if (selectedCommittees.includes('media') && selectedMediaSkills.length === 0) e.mediaSkills = 'Select at least one skill';
        if (selectedCommittees.includes('instructor') && !preferredTeachingLevel) e.preferredTeachingLevel = 'Select level';

        setErrors(e);
        const isValid = Object.keys(e).length === 0;
        if (!isValid) {
            setSubmitError('Please review the required fields highlighted in red.');
        }
        return isValid;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (loading) return;
        if (!validate()) return;
        setLoading(true);
        setSubmitError(null);

        const studentId = toAsciiDigits(email).trim().replace(/@horus\.edu\.eg$/i, '').replace(/\D/g, '');
        const fullEmail = `${studentId}@horus.edu.eg`;

        let digitsPhone = toAsciiDigits(phone).replace(/\D/g, '');
        if (digitsPhone.startsWith('0020')) digitsPhone = digitsPhone.slice(4);
        else if (digitsPhone.startsWith('20') && digitsPhone.length > 10) digitsPhone = digitsPhone.slice(2);
        const normalizedPhone = digitsPhone.startsWith('0') ? digitsPhone.slice(1) : digitsPhone;
        const fullPhone = `+20${normalizedPhone}`;

        const cleanNid = toAsciiDigits(nationalId).replace(/\D/g, '');

        const cleanCf = codeforcesHandle.trim()
            .replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//i, '')
            .replace(/\/$/, '')
            .trim();

        try {
            const res = await fetch('/api/job/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: fullEmail.toLowerCase(),
                    studentId,
                    phone: fullPhone,
                    faculty,
                    academicLevel,
                    nationalId: cleanNid || null,
                    committees: selectedCommittees,
                    mediaSkills: selectedMediaSkills,
                    hasCamera,
                    codeforcesHandle: cleanCf || null,
                    contestExperience: participatedEcpc
                        ? `ECPC: ${participatedEcpc === 'yes' ? 'Yes' : 'No'}${contestExperience.trim() ? ` | ${contestExperience.trim()}` : ''}`
                        : contestExperience.trim() || null,
                    hasEcpcTshirt,
                    organizingExperience: organizingExperience.trim() || null,
                    preferredTeachingLevel: preferredTeachingLevel || null,
                    teachingExperience: teachingExperience.trim() || null,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSuccess(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            setSubmitError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="min-h-screen w-full bg-[#0A0A0A] flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
            {/* Background Pharaoh Video - Desktop Only */}
            <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden z-0">
                <video autoPlay muted loop playsInline className="w-full h-full object-cover object-center opacity-25 filter brightness-75">
                    <source src="/videos/applynow.webm" type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-black/80" />
            </div>

            {/* Success Card */}
            <div className="relative z-10 text-center max-w-md w-full bg-[#121214] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                
                <h1 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
                    تم تسجيل طلبك بنجاح!
                </h1>

                <p className="text-white/70 text-xs sm:text-sm mb-6 leading-relaxed">
                    شكراً لتسجيلك، تقدر تنضم لجروب الواتساب لأي استفسار أو متابعة الخطوات الجاية.
                </p>

                <div className="space-y-2.5">
                    <a
                        href="https://chat.whatsapp.com/JreeORGikEY7J9I0UbcdOD?s=cl&p=a&ilr=4"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#25D366]/20 active:scale-[0.98] cursor-pointer group"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        انضم لجروب الواتساب
                    </a>

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white font-medium text-xs rounded-xl transition-all border border-white/5 cursor-pointer"
                    >
                        العودة للصفحة الرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div dir="ltr" className="min-h-screen lg:h-screen overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[#0A0A0A] text-white flex flex-col justify-between p-3 sm:p-5 lg:p-6 relative">
            {/* Background Pharaoh Video - Desktop Only (Hidden on Mobile) */}
            <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden z-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover object-center opacity-30 filter brightness-90 contrast-110"
                >
                    <source src="/videos/applynow.webm" type="video/webm" />
                </video>
                {/* Gradient Overlays for Desktop */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 via-[#0A0A0A]/55 to-[#0A0A0A]/90" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#0A0A0A_95%)]" />
            </div>

            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[400px] h-[250px] bg-[#E8C15A]/[0.04] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-emerald-500/[0.02] rounded-full blur-[120px]" />
            </div>

            {/* Top Compact Header */}
            <header className="relative z-10 flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3.5">
                    <Link href="/" className="shrink-0 flex items-center justify-center hover:opacity-85 transition-opacity">
                        <Image
                            src="/icons/icpchue.svg"
                            alt="ICPC HUE"
                            width={38}
                            height={38}
                            priority
                            className="w-[38px] h-[38px] object-contain drop-shadow-[0_2px_8px_rgba(232,193,90,0.25)]"
                        />
                    </Link>
                    <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                            Join the Team <span className="text-[#E8C15A] font-black">2027</span>
                        </h1>
                        <p className="text-[11px] text-white/40">Apply for a community role in ICPC HUE</p>
                    </div>
                </div>
            </header>

            {/* Main Content: 2 Balanced Columns — Fits on 1 Screen without Scrolling on Desktop */}
            <main className="relative z-10 flex-1 py-2 lg:py-3 lg:overflow-hidden">
                <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch lg:h-full">
                    
                    {/* LEFT COLUMN: Personal & Academic Info (5 Cols) */}
                    <div className="lg:col-span-5 bg-[#121214] border border-white/10 rounded-xl p-3.5 sm:p-5 flex flex-col lg:justify-between min-w-0 max-w-full overflow-hidden">
                        <div>
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#E8C15A] flex items-center gap-1.5">
                                    <span>01.</span> Personal Information
                                </h2>
                                <span className="text-[9px] text-white/30">Required fields *</span>
                            </div>

                            <div className="space-y-2.5">
                                {/* Full Name */}
                                <div>
                                    <label htmlFor="fullName" className={labelStyle}>Full Name <span className="text-red-400">*</span></label>
                                    <input
                                        id="fullName"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        enterKeyHint="next"
                                        aria-invalid={!!errors.name}
                                        value={name}
                                        onChange={e => { setName(e.target.value); setErrors(p => { const c = { ...p }; delete c.name; return c; }); }}
                                        placeholder="Your full name"
                                        className={cn(iB, errors.name ? iE : iN)}
                                    />
                                    {errors.name && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.name}</p>}
                                </div>

                                {/* Horus ID */}
                                <div>
                                    <label htmlFor="horusId" className={labelStyle}>Horus ID <span className="text-red-400">*</span></label>
                                    <div
                                        dir="ltr"
                                        className={cn(
                                            "flex items-stretch w-full bg-[#1A1A1E] border rounded-lg overflow-hidden transition-all focus-within:ring-1",
                                            errors.email ? iE : iN
                                        )}
                                    >
                                        <input
                                            id="horusId"
                                            name="studentId"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            enterKeyHint="next"
                                            aria-invalid={!!errors.email}
                                            dir="ltr"
                                            value={email}
                                            onChange={e => handleEmail(e.target.value)}
                                            placeholder="8251835"
                                            className="w-full bg-transparent px-3 py-2.5 sm:py-2 text-white text-sm sm:text-xs placeholder-white/40 focus:outline-none text-left font-mono"
                                        />

                                        {/* Hardcoded @horus.edu.eg Suffix Badge on the Right */}
                                        <div className="flex items-center px-2.5 py-2 bg-white/[0.04] border-l border-white/10 text-[#E8C15A]/80 text-xs font-mono shrink-0 select-none">
                                            @horus.edu.eg
                                        </div>
                                    </div>
                                    {errors.email && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.email}</p>}
                                </div>

                                {/* WhatsApp Phone */}
                                <div>
                                    <label htmlFor="phone" className={labelStyle}>WhatsApp Phone <span className="text-red-400">*</span></label>
                                    <div
                                        dir="ltr"
                                        className={cn(
                                            "flex items-stretch w-full bg-[#1A1A1E] border rounded-lg overflow-hidden transition-all focus-within:ring-1",
                                            errors.phone ? iE : iN
                                        )}
                                    >
                                        {/* Prefix Badge (Egyptian Flag +20) */}
                                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/[0.04] border-r border-white/10 text-white/70 text-xs font-bold shrink-0 select-none">
                                            <span className="text-sm leading-none">🇪🇬</span>
                                            <span className="font-mono text-white/80 text-xs">+20</span>
                                        </div>

                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            enterKeyHint="next"
                                            aria-invalid={!!errors.phone}
                                            dir="ltr"
                                            value={phone}
                                            onChange={e => handlePhone(e.target.value)}
                                            placeholder="01012345678"
                                            maxLength={11}
                                            className="w-full bg-transparent px-3 py-2.5 sm:py-2 text-white text-sm sm:text-xs placeholder-white/40 focus:outline-none text-left font-mono"
                                        />
                                    </div>
                                    {errors.phone && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.phone}</p>}
                                </div>

                                {/* Faculty & Academic Level (Combined Compact Row) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0 w-full">
                                    <div className="min-w-0 w-full">
                                        <label htmlFor="faculty" className={labelStyle}>Faculty <span className="text-red-400">*</span></label>
                                        <div className="relative w-full min-w-0">
                                            <select
                                                id="faculty"
                                                name="faculty"
                                                aria-invalid={!!errors.faculty}
                                                value={faculty}
                                                onChange={e => { setFaculty(e.target.value); setErrors(p => { const c = { ...p }; delete c.faculty; return c; }); }}
                                                className={cn(iB, 'appearance-none cursor-pointer w-full min-w-0 max-w-full truncate pr-8', errors.faculty ? iE : iN)}
                                            >
                                                <option value="" className="bg-[#111]">Select faculty</option>
                                                {facultyOptions.map(f => (
                                                    <option key={f.value} value={f.value} className="bg-[#111]">{f.label.split(' / ')[0]}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-white/40">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {errors.faculty && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.faculty}</p>}
                                    </div>

                                    <div className="min-w-0 w-full">
                                        <label className={labelStyle}>Academic Level <span className="text-red-400">*</span></label>
                                        <div className="grid grid-cols-5 gap-1.5 w-full min-w-0">
                                            {levelOptions.map(l => (
                                                <button
                                                    key={l.value}
                                                    type="button"
                                                    onClick={() => { setAcademicLevel(l.value); setErrors(p => { const c = { ...p }; delete c.academicLevel; return c; }); }}
                                                    className={cn(
                                                        'w-full py-2 rounded-lg cursor-pointer text-center text-xs font-bold transition-all border select-none',
                                                        academicLevel === l.value
                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30 font-extrabold'
                                                            : 'bg-[#1A1A1E] border-white/10 text-white/60 hover:bg-white/[0.04]'
                                                    )}
                                                >
                                                    {l.label.replace('Level ', 'L')}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.academicLevel && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.academicLevel}</p>}
                                    </div>
                                </div>

                                {/* National ID */}
                                <div>
                                    <label htmlFor="nationalId" className={labelStyle}>National ID <span className="text-red-400">*</span></label>
                                    <input
                                        id="nationalId"
                                        name="nationalId"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        enterKeyHint="done"
                                        aria-invalid={!!errors.nationalId}
                                        maxLength={14}
                                        value={nationalId}
                                        onChange={e => handleNationalId(e.target.value)}
                                        placeholder="14-digit National ID"
                                        className={cn(iB, errors.nationalId ? iE : iN)}
                                        dir="ltr"
                                    />
                                    {errors.nationalId && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.nationalId}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Committee Selection & Dynamic Questions (7 Cols) */}
                    <div className="lg:col-span-7 bg-[#121214] border border-white/10 rounded-xl p-3.5 sm:p-5 flex flex-col justify-between min-w-0 max-w-full overflow-hidden">
                        
                        <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
                            {/* Section Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/5 shrink-0">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#E8C15A] flex items-center gap-1.5">
                                    <span>02.</span> Choose Your Committee(s)
                                </h2>
                                <span className="text-[9px] text-[#E8C15A] font-semibold">Select 1 or more</span>
                            </div>

                            {/* 4 Committee Cards (Compact 2x2 Grid) */}
                            <div className="grid grid-cols-2 gap-2 shrink-0 mb-3 min-w-0">
                                {committees.map(c => {
                                    const isActive = selectedCommittees.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleCommittee(c.id)}
                                            className={cn(
                                                'relative p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer group flex items-center justify-between gap-1.5 min-w-0',
                                                isActive
                                                    ? 'bg-[#E8C15A]/15 border-[#E8C15A]/40 shadow-md shadow-[#E8C15A]/10'
                                                    : 'bg-[#1A1A1E] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#E8C15A]/15 border border-[#E8C15A]/25 flex items-center justify-center shrink-0">
                                                    {getCommitteeIcon(c.id)}
                                                </div>
                                                <p className={cn('text-xs font-bold leading-tight', isActive ? 'text-[#E8C15A]' : 'text-white')}>
                                                    {c.name}
                                                </p>
                                            </div>
                                            {isActive ? (
                                                <CheckCircle2 size={13} className="text-[#E8C15A] shrink-0" />
                                            ) : (
                                                <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.committees && <p className="text-red-400 text-[9px] -mt-1 mb-2 ml-0.5">{errors.committees}</p>}

                            {/* Dynamic Details Panel: Tabs + Compact Fields with Inner Scroll */}
                            {selectedCommittees.length > 0 ? (
                                <div className="flex-1 flex flex-col min-h-[160px] lg:min-h-0 bg-[#16161A] border border-white/10 rounded-xl p-3 lg:overflow-hidden">
                                    {/* Tabs when multiple committees selected */}
                                    {selectedCommittees.length > 1 && (
                                        <div className={cn(
                                            "grid gap-1.5 pb-2.5 mb-2.5 border-b border-white/5 select-none",
                                            selectedCommittees.length === 2 && "grid-cols-2",
                                            selectedCommittees.length === 3 && "grid-cols-3",
                                            selectedCommittees.length === 4 && "grid-cols-2 sm:grid-cols-4"
                                        )}>
                                            {selectedCommittees.map(id => {
                                                const c = committees.find(item => item.id === id);
                                                if (!c) return null;
                                                const isTabActive = currentTab === id;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => setActiveTab(id)}
                                                        className={cn(
                                                            'w-full py-2 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center',
                                                            isTabActive
                                                                ? 'bg-[#E8C15A] text-black shadow-md shadow-[#E8C15A]/15 font-extrabold'
                                                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                                        )}
                                                    >
                                                        {getCommitteeIcon(id, isTabActive ? 'text-black' : 'text-white/60')}
                                                        <span>{c.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Inner Scrollable Panel — Page itself never scrolls on desktop */}
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 no-scrollbar text-xs max-h-[320px] lg:max-h-none">
                                        
                                        {/* TAB 1: MEDIA */}
                                        {currentTab === 'media' && (
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1 ml-0.5">Your Skills <span className="text-red-400">*</span></label>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {mediaSkills.map(skill => {
                                                            const isSkillActive = selectedMediaSkills.includes(skill);
                                                            return (
                                                                <button
                                                                    key={skill}
                                                                    type="button"
                                                                    onClick={() => toggleMediaSkill(skill)}
                                                                    className={cn(
                                                                        'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border text-left transition-all cursor-pointer leading-tight flex items-center',
                                                                        isSkillActive
                                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                            : 'bg-black/50 border-white/5 text-white/50 hover:bg-white/5'
                                                                    )}
                                                                >
                                                                    {skill.split(' (')[0]}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {errors.mediaSkills && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.mediaSkills}</p>}
                                                </div>

                                                <div>
                                                    <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1 ml-0.5">Own a camera?</label>
                                                    <div className="flex gap-1.5 max-w-[200px]">
                                                        {['yes', 'no'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => setHasCamera(opt)}
                                                                className={cn(
                                                                    'flex-1 py-1.5 rounded-lg text-center text-[10px] font-semibold border transition-all cursor-pointer',
                                                                    hasCamera === opt
                                                                        ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                        : 'bg-black/50 border-white/5 text-white/40 hover:bg-white/5'
                                                                )}
                                                            >
                                                                {opt === 'yes' ? <span className="inline-flex items-center gap-1"><Camera size={11} /> Yes</span> : 'No'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 2: MENTOR */}
                                        {currentTab === 'mentor' && (
                                            <div className="space-y-2.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                                                    <div>
                                                        <label className={labelStyle}>Codeforces Handle <span className="text-red-400">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={codeforcesHandle}
                                                            onChange={e => handleCodeforces(e.target.value)}
                                                            placeholder="your_cf_handle"
                                                            className={cn(iB, errors.codeforcesHandle ? iE : iN)}
                                                            dir="ltr"
                                                        />
                                                        {errors.codeforcesHandle && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.codeforcesHandle}</p>}
                                                    </div>

                                                    <div>
                                                        <label className={labelStyle}>Participated in ECPC?</label>
                                                        <div className="flex gap-1.5">
                                                            {['yes', 'no'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() => setParticipatedEcpc(opt)}
                                                                    className={cn(
                                                                        'flex-1 py-2 rounded-lg text-center text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                                                                        participatedEcpc === opt
                                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                            : 'bg-black/50 border-white/5 text-white/40 hover:bg-white/5'
                                                                    )}
                                                                >
                                                                    {opt === 'yes' ? <><Trophy size={12} /> Yes</> : 'No'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={labelStyle}>Contest Experience (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={contestExperience}
                                                        onChange={e => setContestExperience(e.target.value)}
                                                        placeholder="Team name, qualifications, rank..."
                                                        className={cn(iB, iN)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 3: ORGANIZING */}
                                        {currentTab === 'organizing' && (
                                            <div className="space-y-2.5">
                                                <div>
                                                    <label className={labelStyle}>Has ECPC T-Shirt?</label>
                                                    <div className="flex gap-1.5 max-w-[200px]">
                                                        {['yes', 'no'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => setHasEcpcTshirt(opt)}
                                                                className={cn(
                                                                    'flex-1 py-1.5 rounded-lg text-center text-[10px] font-semibold border transition-all cursor-pointer',
                                                                    hasEcpcTshirt === opt
                                                                        ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                        : 'bg-black/50 border-white/5 text-white/40 hover:bg-white/5'
                                                                )}
                                                            >
                                                                {opt === 'yes' ? <span className="inline-flex items-center gap-1"><Shirt size={11} /> Yes</span> : 'No'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={labelStyle}>Previous Experience (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={organizingExperience}
                                                        onChange={e => setOrganizingExperience(e.target.value)}
                                                        placeholder="Events, conferences, student clubs..."
                                                        className={cn(iB, iN)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 4: INSTRUCTOR */}
                                        {currentTab === 'instructor' && (
                                            <div className="space-y-2.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                                                    <div>
                                                        <label className={labelStyle}>Codeforces Handle <span className="text-red-400">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={codeforcesHandle}
                                                            onChange={e => handleCodeforces(e.target.value)}
                                                            placeholder="your_cf_handle"
                                                            className={cn(iB, errors.codeforcesHandle ? iE : iN)}
                                                            dir="ltr"
                                                        />
                                                        {errors.codeforcesHandle && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.codeforcesHandle}</p>}
                                                    </div>

                                                    <div>
                                                        <label className={labelStyle}>Teaching Level <span className="text-red-400">*</span></label>
                                                        <div className="flex gap-1.5">
                                                            {['Level 0 (C++ Basics & STL)', 'Level 1 (DS & Algorithms)'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() => { setPreferredTeachingLevel(opt); setErrors(p => { const c = { ...p }; delete c.preferredTeachingLevel; return c; }); }}
                                                                    className={cn(
                                                                        'flex-1 py-2 rounded-lg text-center text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center',
                                                                        preferredTeachingLevel === opt
                                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                            : 'bg-black/50 border-white/5 text-white/40 hover:bg-white/5'
                                                                    )}
                                                                >
                                                                    {opt.split(' (')[0]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {errors.preferredTeachingLevel && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.preferredTeachingLevel}</p>}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={labelStyle}>Teaching Experience (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={teachingExperience}
                                                        onChange={e => setTeachingExperience(e.target.value)}
                                                        placeholder="Mentoring, sessions, explanations..."
                                                        className={cn(iB, iN)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-[140px] flex items-center justify-center border border-dashed border-white/5 rounded-xl text-center p-4">
                                    <p className="text-white/20 text-xs">
                                        Select at least one committee above to view role details
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Submit Action & Error Message at Bottom of Right Column */}
                        <div className="pt-3 mt-3 border-t border-white/5 shrink-0 space-y-2">
                            {submitError && (
                                <p className="text-red-400 text-[10px] font-bold text-center">{submitError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "w-full py-3 bg-[#E8C15A] hover:bg-[#D59928] text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#E8C15A]/10 active:scale-[0.99] cursor-pointer",
                                    loading ? "opacity-70 cursor-not-allowed" : "group"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Submitting Application...
                                    </>
                                ) : (
                                    <>
                                        Submit Application
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                    </div>

                </form>
            </main>

            <style jsx global>{`
                .custom-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(232, 193, 90, 0.2);
                    border-radius: 8px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(232, 193, 90, 0.4);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
