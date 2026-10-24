'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, Code, ExternalLink, Flame, Link2, Share2, Trophy } from 'lucide-react';
import type { PublicProfile, PublicSheet } from '@/lib/profile/public-profile';
import { getDisplayName } from '@/lib/utils';

const ACHIEVEMENT_IMAGES: Record<string, string> = {
    welcome: '/images/achievements/WELCOME.webp',
    approval: '/images/achievements/done_approvalcamp.webp',
    'sheet-1': '/images/achievements/sheet1acheavment.webp',
    '500pts': '/images/achievements/500pts.webp',
    instructor: '/images/achievements/instructor.webp',
    'rank1-march-2026': '/images/achievements/rank1_march.webp',
};

const RARITY_TEXT = { legendary: 'text-[#E8C15A]', rare: 'text-sky-400', common: 'text-white/40' } as const;

const SITE_URL = 'https://icpchue.com';

export default function PublicProfileView({ profile }: { profile: PublicProfile }) {
    const name = getDisplayName(profile.name) || 'Member';
    const shareUrl = `${SITE_URL}/profile/${profile.studentId}`;
    const [copied, setCopied] = useState(false);

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
    const tiles = [
        { label: 'Problems solved', value: stats.solved },
        { label: 'Sheets completed', value: `${stats.sheetsDone}/${stats.sheetsStarted || 0}` },
        { label: 'Best streak', value: `${stats.maxStreak}d` },
        { label: 'Codeforces', value: codeforces?.rating ?? '—' },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-white/[0.08] bg-[#121214] p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8C15A] to-[#B89830] flex items-center justify-center text-3xl font-bold text-black">
                        {profile.picture ? (
                            <Image src={profile.picture} alt="" fill unoptimized className="object-cover" />
                        ) : (
                            name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-semibold text-white truncate">{name}</h1>
                        <p className="text-sm text-white/45 mt-0.5">
                            @{profile.studentId}
                            {profile.faculty && <> · {profile.faculty}</>}
                            {profile.joinedAt && <> · Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={copyLink}
                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white/80 hover:bg-white/[0.08] transition-colors cursor-pointer">
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <button type="button" onClick={share}
                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[#E8C15A] text-sm font-semibold text-black hover:bg-[#d4ad45] transition-colors cursor-pointer">
                            <Share2 size={14} /> Share
                        </button>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-white/[0.08] bg-[#121214] divide-x divide-y md:divide-y-0 divide-white/[0.06]">
                {tiles.map(tile => (
                    <div key={tile.label} className="px-5 py-4">
                        <div className="text-2xl font-semibold text-[#E8C15A] tabular-nums">{tile.value}</div>
                        <div className="text-xs text-white/40 mt-0.5">{tile.label}</div>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-white/[0.08] bg-[#121214] p-5 md:p-6">
                <div className="flex items-baseline justify-between gap-3 mb-4">
                    <h2 className="text-base font-semibold text-white">Sheets</h2>
                    {stats.currentStreak > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                            <Flame size={13} className="text-[#E8C15A]" /> {stats.currentStreak}-day streak
                        </span>
                    )}
                </div>
                {profile.sheets.length === 0 ? (
                    <p className="text-sm text-white/40">No sheets solved yet.</p>
                ) : (
                    <div className="space-y-6">
                        {[...levels.entries()].map(([levelNumber, level]) => (
                            <div key={levelNumber}>
                                <h3 className="text-xs font-medium text-white/40 mb-2">Level {levelNumber} · {level.name}</h3>
                                <ul className="space-y-2">
                                    {level.sheets.map(sheet => <SheetRow key={sheet.id} sheet={sheet} />)}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {profile.achievements.length > 0 && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#121214] p-5 md:p-6">
                    <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Trophy size={15} className="text-[#E8C15A]" /> Achievements
                    </h2>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {profile.achievements.map(a => (
                            <li key={a.id} className="rounded-xl border border-white/[0.08] bg-black/20 overflow-hidden">
                                {ACHIEVEMENT_IMAGES[a.id] && (
                                    <div className="relative aspect-[4/3]">
                                        <Image src={ACHIEVEMENT_IMAGES[a.id]} alt="" fill sizes="200px" className="object-cover" />
                                    </div>
                                )}
                                <div className="p-3">
                                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                                    <div className={`text-xs mt-0.5 capitalize ${RARITY_TEXT[a.rarity]}`}>{a.rarity}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(codeforces || profile.leetcode) && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#121214] p-5 md:p-6">
                    <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Code size={15} className="text-[#E8C15A]" /> Elsewhere
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {codeforces && (
                            <a href={`https://codeforces.com/profile/${encodeURIComponent(codeforces.handle)}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 hover:border-[#E8C15A]/40 transition-colors">
                                <div>
                                    <div className="text-sm font-medium text-white">Codeforces · {codeforces.handle}</div>
                                    <div className="text-xs text-white/40 capitalize">
                                        {codeforces.rank || 'Unrated'}{codeforces.maxRating ? ` · max ${codeforces.maxRating}` : ''}
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-white/30" />
                            </a>
                        )}
                        {profile.leetcode && (
                            <a href={`https://leetcode.com/${encodeURIComponent(profile.leetcode)}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 hover:border-[#E8C15A]/40 transition-colors">
                                <div className="text-sm font-medium text-white">LeetCode · {profile.leetcode}</div>
                                <ExternalLink size={14} className="text-white/30" />
                            </a>
                        )}
                    </div>
                </section>
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
                className="w-full flex items-center gap-4 px-4 py-3 text-left cursor-pointer">
                <span className="w-6 text-sm font-semibold text-[#E8C15A]">{sheet.letter}</span>
                <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-white truncate">{sheet.name}</span>
                        <span className="text-xs text-white/50 tabular-nums shrink-0">{sheet.solved}/{sheet.total}</span>
                    </span>
                    <span className="mt-2 block h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <span className={`block h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-[#E8C15A]'}`} style={{ width: `${pct}%` }} />
                    </span>
                </span>
                <ChevronDown size={16} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <ul className="flex flex-wrap gap-2 px-4 pb-4">
                    {sheet.problems.map(p => {
                        const chip = 'inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-white/75';
                        return (
                            <li key={p.letter}>
                                {p.url ? (
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${chip} hover:border-[#E8C15A]/40 hover:text-white transition-colors`}>
                                        <span className="text-[#E8C15A]">{p.letter}</span> {p.title}
                                    </a>
                                ) : (
                                    <span className={chip}><span className="text-[#E8C15A]">{p.letter}</span> {p.title}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </li>
    );
}
