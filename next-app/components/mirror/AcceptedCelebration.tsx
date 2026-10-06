'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEditorStore } from '@/hooks/contest/useEditorStore';

const HYPE_LINES = [
    'عاش يا وحش 🔥',
    'ده الكلام 💪',
    'بطل والله 🏆',
    'كمّل كده، إنت ماشي صح 🚀',
    'سهلة عليك 😎',
    'الكود ده نضيف 👌',
    'واحدة كمان في الجيب ✅',
    'مفيش حاجة توقفك 💥',
];

/** Short rising "ta-da" built with Web Audio, so there is no file to load. */
function playVictoryChime() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = 0.18;
        master.connect(ctx.destination);

        const note = (freq: number, start: number, length: number) => {
            for (const [type, mult, vol] of [['triangle', 1, 1], ['sine', 2, 0.35]] as const) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.value = freq * mult;
                const t = ctx.currentTime + start;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + length);
                osc.connect(gain).connect(master);
                osc.start(t);
                osc.stop(t + length + 0.05);
            }
        };
        // C5 E5 G5, then a held C6 + E6 chord.
        note(523.25, 0, 0.25);
        note(659.25, 0.09, 0.25);
        note(783.99, 0.18, 0.3);
        note(1046.5, 0.3, 0.9);
        note(1318.5, 0.3, 0.9);
        setTimeout(() => ctx.close().catch(() => {}), 1600);
    } catch {
        // Audio is a bonus; never break the page over it.
    }
}

async function fireConfetti() {
    const { default: confetti } = await import('canvas-confetti');
    const colors = ['#E8C15A', '#22c55e', '#ffffff', '#f5d77a'];
    const base = { colors, disableForReducedMotion: true, zIndex: 9999 };
    confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 45, origin: { x: 0.5, y: 0.65 } });
    setTimeout(() => {
        confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
        confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
    }, 180);
}

/**
 * Celebrates a Codeforces-confirmed Accepted on the problem page: confetti, a
 * short chime, and a hype banner. Fires once per submission and respects the
 * editor settings and the OS "reduce motion" preference.
 */
export default function AcceptedCelebration({ cfStatus }: {
    cfStatus: { status?: string; verdict?: string; submissionId?: number | string } | null;
}) {
    const celebrateAccepted = useEditorStore((s) => s.celebrateAccepted);
    const celebrationSound = useEditorStore((s) => s.celebrationSound);
    const lastKeyRef = useRef<string | null>(null);
    const [banner, setBanner] = useState<string | null>(null);

    const accepted = cfStatus?.status === 'done' && (cfStatus.verdict === 'Accepted' || cfStatus.verdict === 'OK');
    const key = accepted ? String(cfStatus?.submissionId ?? 'accepted') : null;

    useEffect(() => {
        if (!key || key === lastKeyRef.current) return;
        lastKeyRef.current = key;
        if (!celebrateAccepted) return;

        if (celebrationSound) playVictoryChime();
        fireConfetti().catch(() => {});
        setBanner(HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)]);
        const timer = setTimeout(() => setBanner(null), 2800);
        return () => clearTimeout(timer);
    }, [key, celebrateAccepted, celebrationSound]);

    return (
        <AnimatePresence>
            {banner && (
                <motion.button
                    type="button"
                    onClick={() => setBanner(null)}
                    initial={{ opacity: 0, y: -24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                    className="fixed top-16 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-2xl bg-[#0f1a12]/95 border border-emerald-400/40 shadow-[0_0_40px_rgba(34,197,94,0.35)] backdrop-blur-md text-center cursor-pointer"
                    aria-live="polite"
                >
                    <div className="text-lg font-black tracking-wide text-emerald-400">ACCEPTED ✅</div>
                    <div dir="rtl" className="text-sm font-semibold text-[#E8C15A] mt-0.5">{banner}</div>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
