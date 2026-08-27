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
    Code2,
    Camera,
    Shirt,
    Sparkles,
    Trophy,
} from 'lucide-react';
import { facultyOptions, levelOptions } from '@/app/register/constants';
import { committees, mediaSkills, tshirtSizes, weeklyHoursOptions } from '@/app/job/constants';

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
    const [portfolioLink, setPortfolioLink] = useState('');

    // Codeforces (Mentor / Instructor)
    const [codeforcesHandle, setCodeforcesHandle] = useState('');

    // Mentor
    const [participatedEcpc, setParticipatedEcpc] = useState('');
    const [contestExperience, setContestExperience] = useState('');
    const [weeklyAvailability, setWeeklyAvailability] = useState('');

    // Organizing
    const [hasEcpcTshirt, setHasEcpcTshirt] = useState('');
    const [tshirtSize, setTshirtSize] = useState('');
    const [campusDays, setCampusDays] = useState('');
    const [organizingExperience, setOrganizingExperience] = useState('');

    // Instructor
    const [preferredTeachingLevel, setPreferredTeachingLevel] = useState('');
    const [teachingExperience, setTeachingExperience] = useState('');

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Compact styling for zoomed-out zero-scroll layout
    const iB = 'w-full px-3 py-2 bg-black/50 border rounded-lg text-white text-xs placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const iN = 'border-white/[0.08] focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20';
    const iE = 'border-red-500/50 focus:ring-red-500/50';
    const labelStyle = 'block text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-0.5';

    const handleEmail = (val: string) => {
        const clean = val.replace(/@horus\.edu\.eg$/i, '');
        setEmail(clean);
        if (errors.email) setErrors(p => { const c = { ...p }; delete c.email; return c; });
    };

    const handlePhone = (val: string) => {
        // Strip non-digits and keep max 11 digits
        const digits = val.replace(/\D/g, '').slice(0, 11);
        setPhone(digits);
        if (errors.phone) setErrors(p => { const c = { ...p }; delete c.phone; return c; });
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
    };

    const toggleMediaSkill = (skill: string) => {
        setSelectedMediaSkills(p => p.includes(skill) ? p.filter(s => s !== skill) : [...p, skill]);
        if (errors.mediaSkills) setErrors(p => { const c = { ...p }; delete c.mediaSkills; return c; });
    };

    const needsCf = selectedCommittees.includes('mentor') || selectedCommittees.includes('instructor');

    const validate = () => {
        const e: FormErrors = {};
        if (!name.trim()) e.name = 'Full name is required';

        const trimmedEmail = email.trim().replace(/@horus\.edu\.eg$/i, '');
        if (!trimmedEmail) {
            e.email = 'Horus ID is required';
        } else if (!/^\d{7,10}$/.test(trimmedEmail)) {
            e.email = 'Enter valid 7-10 digit Horus ID';
        }

        const normalizedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
        if (!normalizedPhone || !/^1\d{9}$/.test(normalizedPhone)) {
            e.phone = 'Valid phone required (01xxxxxxxxx)';
        }

        if (!faculty) e.faculty = 'Faculty required';
        if (!academicLevel) e.academicLevel = 'Level required';
        if (!nationalId.trim() || nationalId.length !== 14) e.nationalId = '14-digit National ID is required';

        if (selectedCommittees.length === 0) e.committees = 'Select at least one committee';
        if (needsCf && !codeforcesHandle.trim()) e.codeforcesHandle = 'Codeforces handle is required';
        if (selectedCommittees.includes('media') && selectedMediaSkills.length === 0) e.mediaSkills = 'Select at least one skill';
        if (selectedCommittees.includes('instructor') && !preferredTeachingLevel) e.preferredTeachingLevel = 'Select level';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (loading) return;
        if (!validate()) return;
        setLoading(true);
        setSubmitError(null);

        const trimmedEmail = email.trim().replace(/@horus\.edu\.eg$/i, '');
        const fullEmail = `${trimmedEmail}@horus.edu.eg`;
        const studentId = trimmedEmail;
        const normalizedPhone = phone.startsWith('0') ? phone.slice(1) : phone;
        const fullPhone = `+20${normalizedPhone}`;

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
                    nationalId: nationalId.trim() || null,
                    committees: selectedCommittees,
                    mediaSkills: selectedMediaSkills,
                    hasCamera,
                    portfolioLink: portfolioLink.trim() || null,
                    codeforcesHandle: codeforcesHandle.trim() || null,
                    contestExperience: participatedEcpc
                        ? `ECPC: ${participatedEcpc === 'yes' ? 'Yes' : 'No'}${contestExperience.trim() ? ` | ${contestExperience.trim()}` : ''}`
                        : contestExperience.trim() || null,
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
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSuccess(true);
        } catch (err: any) {
            setSubmitError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="min-h-screen w-full bg-[#0A0A0A] flex items-center justify-center px-6">
            <div className="text-center max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="w-16 h-16 mx-auto mb-5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
                <p className="text-white/50 text-xs mb-6 leading-relaxed">
                    Your application has been received. We will review your profile and reach out via WhatsApp shortly.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E8C15A] hover:bg-[#D59928] text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]"
                >
                    Back to Home <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );

    return (
        <div dir="ltr" className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#0A0A0A] text-white flex flex-col justify-between p-3 sm:p-5 lg:p-6 relative">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[400px] h-[250px] bg-[#E8C15A]/[0.03] rounded-full blur-[120px]" />
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

            {/* Main Content: 2 Balanced Columns — Fits on 1 Screen without Scrolling */}
            <main className="relative z-10 flex-1 py-3 lg:overflow-hidden">
                <form onSubmit={handleSubmit} className="h-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch">
                    
                    {/* LEFT COLUMN: Personal & Academic Info (5 Cols) */}
                    <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-black/30">
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
                                    <label className={labelStyle}>Full Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => { setName(e.target.value); setErrors(p => { const c = { ...p }; delete c.name; return c; }); }}
                                        placeholder="Your full name"
                                        className={cn(iB, errors.name ? iE : iN)}
                                    />
                                    {errors.name && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.name}</p>}
                                </div>

                                {/* Horus ID */}
                                <div>
                                    <label className={labelStyle}>Horus ID <span className="text-red-400">*</span></label>
                                    <div
                                        dir="ltr"
                                        className={cn(
                                            "flex items-stretch w-full bg-black/50 border rounded-lg overflow-hidden transition-all focus-within:ring-1",
                                            errors.email ? iE : iN
                                        )}
                                    >
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            dir="ltr"
                                            value={email}
                                            onChange={e => handleEmail(e.target.value)}
                                            placeholder="8251835"
                                            className="w-full bg-transparent px-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none text-left font-mono"
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
                                    <label className={labelStyle}>WhatsApp Phone <span className="text-red-400">*</span></label>
                                    <div
                                        dir="ltr"
                                        className={cn(
                                            "flex items-stretch w-full bg-black/50 border rounded-lg overflow-hidden transition-all focus-within:ring-1",
                                            errors.phone ? iE : iN
                                        )}
                                    >
                                        {/* Prefix Badge (Egyptian Flag +20) */}
                                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/[0.04] border-r border-white/10 text-white/70 text-xs font-bold shrink-0 select-none">
                                            <span className="text-sm leading-none">🇪🇬</span>
                                            <span className="font-mono text-white/80 text-xs">+20</span>
                                        </div>

                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            dir="ltr"
                                            value={phone}
                                            onChange={e => handlePhone(e.target.value)}
                                            placeholder="01012345678"
                                            maxLength={11}
                                            className="w-full bg-transparent px-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none text-left font-mono"
                                        />
                                    </div>
                                    {errors.phone && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.phone}</p>}
                                </div>

                                {/* Faculty & Academic Level (Combined Compact Row) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className={labelStyle}>Faculty <span className="text-red-400">*</span></label>
                                        <select
                                            value={faculty}
                                            onChange={e => { setFaculty(e.target.value); setErrors(p => { const c = { ...p }; delete c.faculty; return c; }); }}
                                            className={cn(iB, 'appearance-none cursor-pointer', errors.faculty ? iE : iN)}
                                        >
                                            <option value="" className="bg-[#111]">Select faculty</option>
                                            {facultyOptions.map(f => (
                                                <option key={f.value} value={f.value} className="bg-[#111]">{f.label.split(' / ')[0]}</option>
                                            ))}
                                        </select>
                                        {errors.faculty && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.faculty}</p>}
                                    </div>

                                    <div>
                                        <label className={labelStyle}>Academic Level <span className="text-red-400">*</span></label>
                                        <div className="flex gap-1">
                                            {levelOptions.map(l => (
                                                <button
                                                    key={l.value}
                                                    type="button"
                                                    onClick={() => { setAcademicLevel(l.value); setErrors(p => { const c = { ...p }; delete c.academicLevel; return c; }); }}
                                                    className={cn(
                                                        'flex-1 py-2 rounded-lg cursor-pointer text-center text-xs font-semibold transition-all border',
                                                        academicLevel === l.value
                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                            : 'bg-black/40 border-white/[0.08] text-white/40 hover:bg-white/[0.04]'
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
                                    <label className={labelStyle}>National ID <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={14}
                                        value={nationalId}
                                        onChange={e => { setNationalId(e.target.value.replace(/\D/g, '')); setErrors(p => { const c = { ...p }; delete c.nationalId; return c; }); }}
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
                    <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-black/30 lg:overflow-hidden">
                        
                        <div className="flex-1 flex flex-col lg:overflow-hidden">
                            {/* Section Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/5 shrink-0">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#E8C15A] flex items-center gap-1.5">
                                    <span>02.</span> Choose Your Committee(s)
                                </h2>
                                <span className="text-[9px] text-[#E8C15A] font-semibold">Select 1 or more</span>
                            </div>

                            {/* 4 Committee Cards (Compact 2x2 Grid) */}
                            <div className="grid grid-cols-2 gap-2 shrink-0 mb-3">
                                {committees.map(c => {
                                    const isActive = selectedCommittees.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleCommittee(c.id)}
                                            className={cn(
                                                'relative p-2.5 rounded-lg border text-left transition-all cursor-pointer group flex items-start gap-2.5',
                                                isActive
                                                    ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 shadow-md shadow-[#E8C15A]/5'
                                                    : 'bg-black/40 border-white/[0.06] hover:bg-white/[0.03] hover:border-white/10'
                                            )}
                                        >
                                            <div className="w-7 h-7 rounded-md bg-[#E8C15A]/10 border border-[#E8C15A]/20 flex items-center justify-center shrink-0">
                                                {getCommitteeIcon(c.id)}
                                            </div>
                                            <div className="min-w-0 flex-1 pr-4 self-center">
                                                <p className={cn('text-xs font-bold truncate leading-tight', isActive ? 'text-[#E8C15A]' : 'text-white/90')}>
                                                    {c.name}
                                                </p>
                                            </div>
                                            {isActive && (
                                                <CheckCircle2 size={14} className="text-[#E8C15A] absolute top-2.5 right-2 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.committees && <p className="text-red-400 text-[9px] -mt-1 mb-2 ml-0.5">{errors.committees}</p>}

                            {/* Dynamic Details Panel: Tabs + Compact Fields with Inner Scroll */}
                            {selectedCommittees.length > 0 ? (
                                <div className="flex-1 flex flex-col min-h-[160px] lg:min-h-0 bg-black/40 border border-white/5 rounded-xl p-3 lg:overflow-hidden">
                                    {/* Tabs when multiple committees selected */}
                                    {selectedCommittees.length > 1 && (
                                        <div className="flex gap-1.5 pb-2.5 mb-2 border-b border-white/5 overflow-x-auto shrink-0">
                                            {selectedCommittees.map(id => {
                                                const c = committees.find(item => item.id === id);
                                                if (!c) return null;
                                                const isTabActive = activeTab === id;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => setActiveTab(id)}
                                                        className={cn(
                                                            'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer',
                                                            isTabActive
                                                                ? 'bg-[#E8C15A] text-black shadow-sm'
                                                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                        )}
                                                    >
                                                        {getCommitteeIcon(id, isTabActive ? 'text-black' : 'text-white/60')}
                                                        <span>{c.name.split(' ')[0]}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Inner Scrollable Panel — Page itself never scrolls on desktop */}
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scroll text-xs max-h-[320px] lg:max-h-none">
                                        
                                        {/* TAB 1: MEDIA */}
                                        {(selectedCommittees.length === 1 ? selectedCommittees.includes('media') : activeTab === 'media') && (
                                            <div className="space-y-2.5">
                                                <div>
                                                    <label className={labelStyle}>Your Skills <span className="text-red-400">*</span></label>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {mediaSkills.map(skill => {
                                                            const isSkillActive = selectedMediaSkills.includes(skill);
                                                            return (
                                                                <button
                                                                    key={skill}
                                                                    type="button"
                                                                    onClick={() => toggleMediaSkill(skill)}
                                                                    className={cn(
                                                                        'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border text-left transition-all cursor-pointer truncate',
                                                                        isSkillActive
                                                                            ? 'bg-[#E8C15A]/15 text-[#E8C15A] border-[#E8C15A]/30'
                                                                            : 'bg-black/50 border-white/5 text-white/40 hover:bg-white/5'
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
                                                    <label className={labelStyle}>Own a camera?</label>
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
                                        {(selectedCommittees.length === 1 ? selectedCommittees.includes('mentor') : activeTab === 'mentor') && (
                                            <div className="space-y-2.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                                                    <div>
                                                        <label className={labelStyle}>Codeforces Handle <span className="text-red-400">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={codeforcesHandle}
                                                            onChange={e => { setCodeforcesHandle(e.target.value); setErrors(p => { const c = { ...p }; delete c.codeforcesHandle; return c; }); }}
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
                                        {(selectedCommittees.length === 1 ? selectedCommittees.includes('organizing') : activeTab === 'organizing') && (
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
                                        {(selectedCommittees.length === 1 ? selectedCommittees.includes('instructor') : activeTab === 'instructor') && (
                                            <div className="space-y-2.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                                                    <div>
                                                        <label className={labelStyle}>Codeforces Handle <span className="text-red-400">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={codeforcesHandle}
                                                            onChange={e => { setCodeforcesHandle(e.target.value); setErrors(p => { const c = { ...p }; delete c.codeforcesHandle; return c; }); }}
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
            `}</style>
        </div>
    );
}
