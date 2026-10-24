'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, Code, ExternalLink, Flame, Layers, Link2, Pencil, Share2, Target, Trophy, X } from 'lucide-react';
import type { PublicProfile, PublicSheet } from '@/lib/profile/public-profile';
import { ACHIEVEMENT_META } from '@/lib/achievements/catalog';
import { SOCIALS, type SocialLinks } from '@/lib/profile/socials';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';

// Global marketing CSS restyles h1-h3, p and section, so this view sticks to
// divs/spans and sets every size itself.

const ACHIEVEMENT_IMAGES: Record<string, string> = Object.fromEntries(Object.entries(ACHIEVEMENT_META).map(([id, m]) => [id, m.imageSrc]));

const RARITY_TEXT = { legendary: 'text-[#E8C15A]', rare: 'text-sky-400', common: 'text-white/40' } as const;
const ROLE_LABEL: Record<string, string> = { owner: 'Founder', instructor: 'Instructor', mentor: 'Mentor' };
const SITE_URL = 'https://icpchue.com';

const CARD = 'rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]';
const LABEL = 'text-[10px] font-mono uppercase tracking-wider text-white/40';

export default function PublicProfileView({ profile }: { profile: PublicProfile }) {
    const name = getDisplayName(profile.name) || 'Member';
    const shareUrl = `${SITE_URL}/profile/${profile.studentId}`;
    const { user } = useAuth();
    const isOwner = user?.email?.split('@')[0] === profile.studentId;
    const [copied, setCopied] = useState(false);
    const [socials, setSocials] = useState<SocialLinks>(profile.socials || {});

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked: the link is still visible in the address bar */ }
    };

    const share = async () => {
        if (navigator.share) {
            try { await navigator.share({ title: `${name} on ICPC HUE`, url: shareUrl }); } catch { /* cancelled */ }
        } else {
            await copyLink();
        }
    };

    const levels = new Map<number, { name: string; sheets: PublicSheet[] }>();
    for (const sheet of profile.sheets) {
        const level = levels.get(sheet.levelNumber) ?? { name: sheet.levelName, sheets: [] };
        level.sheets.push(sheet);
        levels.set(sheet.levelNumber, level);
    }

    const { stats, codeforces } = profile;
    const totalProblems = profile.sheets.reduce((n, s) => n + s.total, 0);
    const solvedPct = totalProblems ? Math.min(100, Math.round((stats.solved / totalProblems) * 100)) : 0;
    const joined = profile.joinedAt && new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const roleLabel = ROLE_LABEL[profile.role];

    return (
        <div className="ui-compact grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Identity */}
            <div className={`${CARD} col-span-2 md:row-span-2 flex flex-col gap-5`}>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="!text-2xl md:!text-[28px] !leading-tight font-semibold tracking-tight text-white break-words">{name}</h1>
                        {roleLabel && (
                            <span className="rounded-md border border-[#E8C15A]/25 bg-[#E8C15A]/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#E8C15A]">{roleLabel}</span>
                        )}
                    </div>
                    <div className="mt-1 text-sm font-mono text-white/40">@{profile.studentId}</div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {profile.faculty && <Fact label="Faculty" value={profile.faculty} wide />}
                    {profile.studentLevel && <Fact label="Year" value={profile.studentLevel} />}
                    {joined && <Fact label="Joined" value={joined} />}
                </dl>

                <Socials socials={socials} isOwner={isOwner} onSaved={setSocials} />

                <div className="mt-auto flex gap-2">
                    <button type="button" onClick={share}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-[#E8C15A] text-xs font-semibold text-black hover:bg-[#d4ad45] transition-colors cursor-pointer">
                        <Share2 size={13} /> Share profile
                    </button>
                    <button type="button" onClick={copyLink}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-white/80 hover:bg-white/[0.08] transition-colors cursor-pointer">
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Link2 size={13} />}
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                </div>
            </div>

            {/* Solved */}
            <div className={`${CARD} flex flex-col justify-between gap-4`}>
                <Label icon={<Target size={12} />}>Solved</Label>
                <div>
                    <div className="text-3xl font-semibold text-white tabular-nums leading-none">{stats.solved}</div>
                    {totalProblems > 0 && (
                        <>
                            <div className="mt-3 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                                <div className="h-full rounded-full bg-[#E8C15A]" style={{ width: `${solvedPct}%` }} />
                            </div>
                            <div className="mt-2 text-[11px] text-white/40 tabular-nums">of {totalProblems} in started sheets</div>
                        </>
                    )}
                </div>
            </div>

            {/* Streak */}
            <div className={`${CARD} flex flex-col justify-between gap-4`}>
                <Label icon={<Flame size={12} />}>Streak</Label>
                <div>
                    <div className="text-3xl font-semibold text-white tabular-nums leading-none">
                        {stats.currentStreak}<span className="ml-1 text-base text-white/35">days</span>
                    </div>
                    <div className="mt-2 text-[11px] text-white/40 tabular-nums">Best {stats.maxStreak} · {stats.activeDays} active days</div>
                </div>
            </div>

            {/* Codeforces */}
            {codeforces ? (
                <a href={`https://codeforces.com/profile/${encodeURIComponent(codeforces.handle)}`} target="_blank" rel="noopener noreferrer"
                    className={`${CARD} col-span-2 group flex flex-col justify-between gap-4 hover:border-white/20 transition-colors`}>
                    <div className="flex items-center justify-between">
                        <Label icon={<Code size={12} />}>Codeforces</Label>
                        <ExternalLink size={13} className="text-white/25 group-hover:text-white/60 transition-colors" />
                    </div>
                    <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            <div className={`text-3xl font-semibold tabular-nums leading-none ${cfColor(codeforces.rating)}`}>{codeforces.rating || 'Unrated'}</div>
                            <div className="mt-2 text-[11px] text-white/40 truncate">
                                {codeforces.rating ? <><span className={`capitalize ${cfColor(codeforces.rating)}`}>{codeforces.rank}</span> · </> : null}
                                <span className="font-mono">{codeforces.handle}</span>
                            </div>
                        </div>
                        {codeforces.maxRating ? (
                            <div className="text-right shrink-0">
                                <div className={LABEL}>Max</div>
                                <div className={`mt-1 text-sm font-semibold tabular-nums ${cfColor(codeforces.maxRating)}`}>{codeforces.maxRating}</div>
                            </div>
                        ) : null}
                    </div>
                </a>
            ) : (
                <div className={`${CARD} col-span-2 flex flex-col justify-between gap-4`}>
                    <Label icon={<Code size={12} />}>Codeforces</Label>
                    <div className="text-sm text-white/35">No Codeforces account linked.</div>
                </div>
            )}

            {/* Sheets */}
            <div className={`${CARD} col-span-2 md:col-span-4`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <Label icon={<Layers size={12} />}>Sheets</Label>
                    {profile.sheets.length > 0 && (
                        <span className="text-[11px] text-white/40 tabular-nums">{stats.sheetsDone} of {stats.sheetsStarted} completed</span>
                    )}
                </div>
                {profile.sheets.length === 0 ? (
                    <div className="text-sm text-white/40">No sheets solved yet.</div>
                ) : (
                    <div className="space-y-4">
                        {[...levels.entries()].map(([levelNumber, level]) => (
                            <div key={levelNumber}>
                                <div className="mb-2 text-xs font-medium text-white/50">Level {levelNumber} · {level.name}</div>
                                <ul className="grid md:grid-cols-2 gap-2 items-start">
                                    {level.sheets.map(sheet => <SheetRow key={sheet.id} sheet={sheet} />)}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Achievements */}
            {profile.achievements.length > 0 && (
                <div className={`${CARD} col-span-2 md:col-span-4`}>
                    <div className="mb-4"><Label icon={<Trophy size={12} />}>Achievements</Label></div>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {profile.achievements.map(a => (
                            <li key={a.id} title={a.description} className="rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden">
                                {ACHIEVEMENT_IMAGES[a.id] && (
                                    <div className="relative aspect-square">
                                        <Image src={ACHIEVEMENT_IMAGES[a.id]} alt="" fill sizes="160px" className="object-cover" />
                                    </div>
                                )}
                                <div className="px-2.5 py-2">
                                    <div className="text-xs font-medium text-white truncate">{a.name}</div>
                                    <div className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${RARITY_TEXT[a.rarity]}`}>{a.rarity}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Codeforces rank colours, by rating.
function cfColor(rating?: number) {
    if (!rating) return 'text-white/60';
    if (rating >= 2400) return 'text-red-400';
    if (rating >= 2100) return 'text-orange-400';
    if (rating >= 1900) return 'text-violet-400';
    if (rating >= 1600) return 'text-blue-400';
    if (rating >= 1400) return 'text-cyan-400';
    if (rating >= 1200) return 'text-green-400';
    return 'text-zinc-400';
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className={`inline-flex items-center gap-1.5 ${LABEL}`}>
            <span className="text-[#E8C15A]">{icon}</span>{children}
        </div>
    );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <dt className={LABEL}>{label}</dt>
            <dd className="mt-1 text-sm text-white/85 break-words">{value}</dd>
        </div>
    );
}

function Socials({ socials, isOwner, onSaved }: { socials: SocialLinks; isOwner: boolean; onSaved: (s: SocialLinks) => void }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<SocialLinks>(socials);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const shown = SOCIALS.filter(s => socials[s.key]);

    if (!isOwner && shown.length === 0) return null;

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/profile/socials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ socials: draft }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'Could not save your links');
            onSaved(data.socials);
            setEditing(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save your links');
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className={LABEL}>Your links</span>
                    <button type="button" onClick={() => { setEditing(false); setError(''); }} aria-label="Cancel"
                        className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/5 cursor-pointer"><X size={13} /></button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                    {SOCIALS.map(s => (
                        <label key={s.key} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 h-9 focus-within:border-[#E8C15A]/50">
                            <span className="w-16 shrink-0 text-[11px] text-white/45">{s.label}</span>
                            <input value={draft[s.key] || ''} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}
                                placeholder="username or link" dir="ltr"
                                className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder-white/20 focus:outline-none" />
                        </label>
                    ))}
                </div>
                {error && <div className="text-[11px] text-red-400">{error}</div>}
                <div className="flex justify-end">
                    <button type="button" onClick={save} disabled={saving}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#E8C15A] text-xs font-semibold text-black hover:bg-[#d4ad45] disabled:opacity-60 cursor-pointer">
                        <Check size={12} /> {saving ? 'Saving…' : 'Save links'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className={LABEL}>Links</span>
                {isOwner && (
                    <button type="button" onClick={() => { setDraft(socials); setEditing(true); }}
                        className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-[#E8C15A] cursor-pointer">
                        <Pencil size={11} /> {shown.length ? 'Edit' : 'Add your links'}
                    </button>
                )}
            </div>
            {shown.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {shown.map(s => (
                        <a key={s.key} href={s.url(socials[s.key]!)} target="_blank" rel="noopener noreferrer me"
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-white/75 hover:text-white hover:border-[#E8C15A]/40 transition-colors">
                            {s.label}<ExternalLink size={10} className="text-white/30" />
                        </a>
                    ))}
                </div>
            ) : (
                <div className="text-xs text-white/30">GitHub, LinkedIn, X and more. Only you see this prompt.</div>
            )}
        </div>
    );
}

function SheetRow({ sheet }: { sheet: PublicSheet }) {
    const [open, setOpen] = useState(false);
    const pct = sheet.total > 0 ? Math.min(100, Math.round((sheet.solved / sheet.total) * 100)) : 0;
    const done = sheet.total > 0 && sheet.solved >= sheet.total;

    return (
        <li className="rounded-xl border border-white/[0.06] bg-black/20">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer">
                <span className="w-5 text-xs font-bold text-[#E8C15A]">{sheet.letter}</span>
                <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium text-white truncate">{sheet.name}</span>
                        <span className="text-[10px] font-mono text-white/45 tabular-nums shrink-0">{sheet.solved}/{sheet.total}</span>
                    </span>
                    <span className="mt-1.5 block h-1 rounded-full bg-white/[0.08] overflow-hidden">
                        <span className={`block h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-[#E8C15A]'}`} style={{ width: `${pct}%` }} />
                    </span>
                </span>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <ul className="flex flex-wrap gap-1.5 px-3 pb-3">
                    {sheet.problems.map(p => {
                        const chip = 'inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/75';
                        return (
                            <li key={p.letter}>
                                {p.url ? (
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${chip} hover:border-[#E8C15A]/40 hover:text-white transition-colors`}>
                                        <span className="font-bold text-[#E8C15A]">{p.letter}</span> {p.title}
                                    </a>
                                ) : (
                                    <span className={chip}><span className="font-bold text-[#E8C15A]">{p.letter}</span> {p.title}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </li>
    );
}
