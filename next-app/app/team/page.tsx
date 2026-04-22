'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowRight, HelpCircle, Upload, CheckCircle2, Crown, X } from 'lucide-react';

const faculties = [
    'Dentistry', 'Pharmacy', 'Engineering', 'Medicine', 'Physical Therapy',
    'Business Administration', 'Artificial Intelligence and Information',
    'Applied Health Sciences Technology', 'Al_Alsun and Translation', 'Fine Arts and Design'
];

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' '); }

type MemberData = {
    name: string; studentId: string; nationalId: string;
    codeforces: string; icpcEmail: string; faculty: string;
    idFront: File | null; idBack: File | null;
    idFrontPreview: string; idBackPreview: string;
};

const empty = (): MemberData => ({
    name: '', studentId: '', nationalId: '', codeforces: '', icpcEmail: '', faculty: '',
    idFront: null, idBack: null, idFrontPreview: '', idBackPreview: '',
});

export default function TeamRegistration() {
    const [members, setMembers] = useState<MemberData[]>([empty(), empty(), empty()]);
    const [teamName, setTeamName] = useState('');
    const [leader, setLeader] = useState(0);
    const [leaderPhone, setLeaderPhone] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const iB = 'w-full px-3.5 py-3 bg-black/50 border rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 transition-all';
    const iN = 'border-white/[0.06] focus:ring-[#E8C15A]/50 focus:border-[#E8C15A]/20';
    const iE = 'border-red-500/50 focus:ring-red-500/50';

    const upd = (i: number, f: keyof MemberData, v: string | File | null) => {
        setMembers(p => {
            const c = [...p]; const m = { ...c[i] };
            if (f === 'studentId' || f === 'nationalId') (m as any)[f] = (v as string).replace(/\D/g, '');
            else (m as any)[f] = v;
            if (f === 'idFront' && v instanceof File) m.idFrontPreview = URL.createObjectURL(v);
            if (f === 'idBack' && v instanceof File) m.idBackPreview = URL.createObjectURL(v);
            if (f === 'idFront' && v === null) m.idFrontPreview = '';
            if (f === 'idBack' && v === null) m.idBackPreview = '';
            c[i] = m; return c;
        });
        setErrors(p => { const c = { ...p }; delete c[`m${i}_${f}`]; return c; });
    };

    const handlePhone = (val: string) => {
        let v = val.replace(/[^\d+]/g, '');
        if (v && !v.startsWith('+20')) {
            if (v.startsWith('20')) v = '+' + v;
            else if (v.startsWith('0')) v = '+20' + v.substring(1);
            else if (!v.startsWith('+')) v = '+20' + v;
        }
        if (v.length > 13) v = v.substring(0, 13);
        setLeaderPhone(v);
        setErrors(p => { const c = { ...p }; delete c.phone; return c; });
    };

    const validate = () => {
        const e: Record<string, string> = {};
        
        const t = teamName.trim();
        if (!t) e.teamName = 'Required';
        else if (t.length > 30) e.teamName = 'Max 30 characters';
        else if (!/^[A-Za-z0-9]/.test(t)) e.teamName = 'Must start with a letter or number';
        else if (!/^[A-Za-z0-9\s_\-]+$/.test(t)) e.teamName = 'Only English letters, numbers, -, _ allowed';
        else if (/\s{2,}/.test(t)) e.teamName = 'No consecutive spaces allowed';

        members.forEach((m, i) => {
            const n = m.name.trim();
            if (!n) e[`m${i}_name`] = 'Required';
            else if (!/^[A-Za-z0-9\s\-_]+$/.test(n)) e[`m${i}_name`] = 'English only';
            
            if (!m.studentId || m.studentId.length < 7) e[`m${i}_studentId`] = 'Min 7 digits';
            if (!m.nationalId || m.nationalId.length !== 14) e[`m${i}_nationalId`] = '14 digits';
            if (!m.faculty) e[`m${i}_faculty`] = 'Required';
            if (!m.idFront) e[`m${i}_idFront`] = 'Required';
            if (!m.idBack) e[`m${i}_idBack`] = 'Required';
        });
        if (!leaderPhone || !/^\+20\d{10}$/.test(leaderPhone)) e.phone = 'Valid phone (+20...)';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (loading) return;
        if (!validate()) return;
        setLoading(true); setSubmitError(null);

        const fd = new FormData();
        fd.append('team_name', teamName);
        members.forEach((m, i) => {
            const n = i + 1;
            fd.append(`member${n}_name`, m.name);
            fd.append(`member${n}_student_id`, m.studentId);
            fd.append(`member${n}_national_id`, m.nationalId);
            fd.append(`member${n}_codeforces`, m.codeforces);
            fd.append(`member${n}_icpc_email`, m.icpcEmail);
            fd.append(`member${n}_faculty`, m.faculty);
            if (m.idFront) fd.append(`member${n}_id_front`, m.idFront);
            if (m.idBack) fd.append(`member${n}_id_back`, m.idBack);
        });
        fd.append('leader', String(leader + 1));
        fd.append('leader_phone', leaderPhone);

        try {
            const res = await fetch('/api/team', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setSuccess(true);
        } catch (err: any) { setSubmitError(err.message); }
        finally { setLoading(false); }
    };

    if (success) return (
        <div className="min-h-[100dvh] w-full bg-[#0A0A0A] flex items-center justify-center px-6">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-green-500" /></div>
                <h1 className="text-3xl font-bold text-white mb-3">Team Registered!</h1>
                <p className="text-white/40 text-sm mb-8">Your team has been successfully registered. We&apos;ll review your application shortly.</p>
                <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8C15A] text-black font-bold text-sm rounded-xl hover:bg-[#D59928] transition-all">Back to Home <ArrowRight size={16} /></Link>
            </div>
        </div>
    );

    const FUp = ({ idx, side }: { idx: number; side: 'Front' | 'Back' }) => {
        const fld = side === 'Front' ? 'idFront' : 'idBack';
        const prev = side === 'Front' ? 'idFrontPreview' : 'idBackPreview';
        const file = members[idx][fld]; const preview = members[idx][prev];
        const ek = `m${idx}_${fld}`;
        return (
            <div className="flex-1">
                <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">{side}</label>
                <label className={cn('flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden relative',
                    errors[ek] ? 'border-red-500/40 bg-red-500/5' : file ? 'border-[#E8C15A]/20 bg-[#E8C15A]/5' : 'border-white/[0.06] bg-black/30 hover:border-white/15')}>
                    {preview ? (<><img src={preview} alt="" className="w-full h-full object-cover opacity-60" /><button type="button" onClick={e => { e.preventDefault(); upd(idx, fld, null); }} className="absolute top-1.5 right-1.5 p-1 z-10 transition-transform hover:scale-110"><X size={16} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] opacity-80 hover:opacity-100" /></button></>) : (<><Upload size={16} className="text-white/15 mb-0.5" /><span className="text-white/20 text-[8px]">Upload (max 5MB)</span></>)}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); e.target.value = ''; return; } upd(idx, fld, f); } }} />
                </label>
            </div>
        );
    };

    return (
        <div dir="ltr" className="min-h-[100dvh] w-full bg-[#0A0A0A]">
            {/* Hero with video background */}
            <div className="relative w-full h-[30vh] min-h-[220px] overflow-hidden flex items-center justify-center">
                <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
                    <source src="/videos/applynow.webm" type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0A0A0A]" />
                <div className="absolute top-6 left-6 sm:left-10 z-20">
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity"><Image src="/icons/icpchue.svg" alt="ICPC HUE" width={40} height={40} className="drop-shadow-2xl" /></Link>
                </div>
                <div className="relative z-10 text-center px-6">
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-1.5">Team Registration</h1>
                    <p className="text-white/40 text-sm">Register your 3-member ICPC team. Fields marked <span className="text-red-400">*</span> are required.</p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-8 relative z-10">
                <form onSubmit={handleSubmit}>
                    {submitError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6 max-w-2xl mx-auto">{submitError}</div>
                    )}

                    {/* ICPC Global Help Banner */}
                    <div className="mb-6 max-w-2xl mx-auto">
                        <button type="button" onClick={() => setShowHelp(!showHelp)} className="w-full flex items-center justify-between bg-[#E8C15A]/[0.04] border border-[#E8C15A]/10 rounded-xl px-4 py-3 text-left group hover:border-[#E8C15A]/20 transition-all">
                            <span className="text-white/60 text-xs flex items-center gap-2"><HelpCircle size={14} className="text-[#E8C15A]" /> How to get your ICPC Global email?</span>
                            <span className="text-[#E8C15A] text-xs font-bold">{showHelp ? 'Hide' : 'Show'}</span>
                        </button>
                        {showHelp && (
                            <div className="mt-2 bg-[#111] border border-white/5 rounded-xl p-4 space-y-2">
                                <p className="text-white/50 text-xs">Each member needs an <a href="https://icpc.global" target="_blank" rel="noopener noreferrer" className="text-[#E8C15A] underline">icpc.global</a> account. Enter the email you registered with.</p>
                                <a href="https://drive.google.com/file/d/1HAcSbtF1J9Hixk0JLd0oGiuFIiflT6I0/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#E8C15A] text-xs font-bold hover:underline">📹 Watch Tutorial <ArrowRight size={12} /></a>
                            </div>
                        )}
                    </div>

                    {/* Team Name Input */}
                    <div className="mb-6 max-w-2xl mx-auto bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                        <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-2 ml-0.5 flex items-center gap-2">Team Name <span className="text-red-400">*</span></label>
                        <input type="text" maxLength={30} value={teamName} onChange={e => { setTeamName(e.target.value); setErrors(p => { const c = { ...p }; delete c.teamName; return c; }); }} placeholder="Enter your ICPC Team Name" className={cn(iB, 'text-lg py-4 placeholder:text-white/20 font-bold', errors.teamName ? iE : iN)} />
                        {errors.teamName ? (
                            <p className="text-red-400 text-[10px] mt-1.5 ml-0.5 font-bold">{errors.teamName}</p>
                        ) : (
                            <p className="text-white/30 text-[10px] mt-1.5 ml-0.5">English letters, numbers, - and _ only. Max 30 chars. Must start with letter/number.</p>
                        )}
                    </div>

                    {/* 3 Member Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                        {members.map((m, idx) => (
                            <div key={idx} className={cn(
                                'rounded-2xl border p-5 space-y-3.5 transition-all',
                                leader === idx ? 'border-[#E8C15A]/25 bg-[#E8C15A]/[0.02] shadow-lg shadow-[#E8C15A]/[0.03]' : 'border-white/[0.06] bg-white/[0.01]'
                            )}>
                                {/* Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                    <h2 className="text-white font-bold text-sm flex items-center gap-2">
                                        {leader === idx && <Crown size={13} className="text-[#E8C15A]" />}
                                        Member {idx + 1} {leader === idx && <span className="text-[#E8C15A] text-[10px] font-bold uppercase tracking-wider">(Leader)</span>}
                                    </h2>
                                    <label className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-[10px] font-bold uppercase tracking-wider transition-all border',
                                        leader === idx ? 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30' : 'bg-black/30 text-white/20 border-white/5 hover:border-white/10 hover:text-white/40')}>
                                        <input type="radio" name="leader" checked={leader === idx} onChange={() => setLeader(idx)} className="hidden" />
                                        <Crown size={10} /> Leader
                                    </label>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">Full Name <span className="text-red-400">*</span></label>
                                    <input type="text" value={m.name} onChange={e => upd(idx, 'name', e.target.value)} placeholder="Full name" className={cn(iB, errors[`m${idx}_name`] ? iE : iN)} />
                                    {errors[`m${idx}_name`] && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors[`m${idx}_name`]}</p>}
                                </div>

                                {/* Student ID & Faculty */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">Student ID <span className="text-red-400">*</span></label>
                                        <input type="text" value={m.studentId} onChange={e => upd(idx, 'studentId', e.target.value)} placeholder="82xxxxx" maxLength={12} className={cn(iB, errors[`m${idx}_studentId`] ? iE : iN)} />
                                        {errors[`m${idx}_studentId`] && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors[`m${idx}_studentId`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">Faculty <span className="text-red-400">*</span></label>
                                        <select value={m.faculty} onChange={e => upd(idx, 'faculty', e.target.value)} className={cn(iB, 'appearance-none', errors[`m${idx}_faculty`] ? iE : iN)}>
                                            <option value="" className="bg-black">Select</option>
                                            {faculties.map(f => <option key={f} value={f} className="bg-black">{f}</option>)}
                                        </select>
                                        {errors[`m${idx}_faculty`] && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors[`m${idx}_faculty`]}</p>}
                                    </div>
                                </div>

                                {/* National ID */}
                                <div>
                                    <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">National ID <span className="text-red-400">*</span></label>
                                    <input type="text" value={m.nationalId} onChange={e => upd(idx, 'nationalId', e.target.value)} placeholder="14-digit National ID" maxLength={14} className={cn(iB, errors[`m${idx}_nationalId`] ? iE : iN)} />
                                    {errors[`m${idx}_nationalId`] && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors[`m${idx}_nationalId`]}</p>}
                                </div>

                                {/* Codeforces & ICPC Email */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">CF Handle</label>
                                        <input type="text" value={m.codeforces} onChange={e => upd(idx, 'codeforces', e.target.value)} placeholder="handle" className={cn(iB, iN)} />
                                    </div>
                                    <div>
                                        <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5 flex items-center gap-1">ICPC Email <HelpCircle size={9} className="text-white/20" /></label>
                                        <input type="email" value={m.icpcEmail} onChange={e => upd(idx, 'icpcEmail', e.target.value)} placeholder="icpc@email.com" className={cn(iB, iN)} />
                                    </div>
                                </div>

                                {/* ID Card Photos */}
                                <div>
                                    <label className="block text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-0.5">National ID Card <span className="text-red-400">*</span></label>
                                    <div className="flex gap-2.5">
                                        <FUp idx={idx} side="Front" />
                                        <FUp idx={idx} side="Back" />
                                    </div>
                                </div>

                                {/* Leader phone inside leader card */}
                                {leader === idx && (
                                    <div className="pt-2 border-t border-[#E8C15A]/10">
                                        <label className="block text-[#E8C15A]/60 text-[9px] font-bold uppercase tracking-wider mb-1 ml-0.5">Leader Phone <span className="text-red-400">*</span></label>
                                        <input type="text" value={leaderPhone} onChange={e => handlePhone(e.target.value)} placeholder="+20xxxxxxxxxx" className={cn(iB, errors.phone ? iE : iN)} />
                                        {errors.phone && <p className="text-red-400 text-[9px] mt-0.5 ml-0.5">{errors.phone}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-center">
                        <button type="submit" disabled={loading} className={cn("px-12 py-4 bg-[#E8C15A] hover:bg-[#D59928] text-black text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#E8C15A]/10 active:scale-[0.98]", loading ? "opacity-70 cursor-not-allowed" : "group")}>
                            {loading ? <><Loader2 className="animate-spin" size={18} /> Uploading Photos...</> : <>Register Team <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </div>
                </form>

                <p className="text-center text-white/10 text-[9px] mt-12 font-bold uppercase tracking-[0.2em]">&copy; 2026 ICPC HUE — Horus University</p>
            </div>

            <style jsx>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
            `}</style>
        </div>
    );
}
