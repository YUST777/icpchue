'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';

/** Under the Stargazer badge: the member enters a GitHub user name and we check the repo's stars. */
export default function StarClaim({ onClaimed }: { onClaimed: () => void }) {
    const [username, setUsername] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    async function claim(e: React.FormEvent) {
        e.preventDefault();
        if (busy || !username.trim()) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch('/api/achievements/claim-star', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.claimed) {
                setMessage({ ok: true, text: 'Thank you for the star! The badge is yours.' });
                window.dispatchEvent(new Event('achievements:changed'));
                setTimeout(onClaimed, 1400);
            } else {
                setMessage({ ok: false, text: data.error || 'Something went wrong. Try again.' });
            }
        } catch {
            setMessage({ ok: false, text: 'Could not reach the server. Try again.' });
        }
        setBusy(false);
    }

    return (
        <form onSubmit={claim} className="flex flex-col gap-2">
            <label htmlFor="star-username" className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">Your GitHub user name</label>
            <div className="flex gap-2">
                <input id="star-username" value={username} onChange={e => setUsername(e.target.value)} maxLength={80}
                    placeholder="e.g. YUST777" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    className="min-w-0 flex-1 h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8C15A]/60" />
                <button type="submit" disabled={busy || !username.trim()}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#E8C15A] text-black text-sm font-semibold hover:bg-[#d4ad45] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />} Claim
                </button>
            </div>
            {message && <p role="status" className={`text-xs leading-relaxed ${message.ok ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>}
        </form>
    );
}
