'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/hooks/contest/useEditorStore';

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
    // Not gated on prefers-reduced-motion: it is a one-second burst, Windows
    // turns that preference on whenever animations are off, and students can
    // disable it in editor settings.
    const base = { colors, zIndex: 9999 };
    confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 45, origin: { x: 0.5, y: 0.65 } });
    setTimeout(() => {
        confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
        confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
    }, 180);
}

/**
 * Celebrates a Codeforces-confirmed Accepted on the problem page with confetti
 * and a short chime. Fires once per submission; both can be turned off in the
 * editor settings.
 */
export default function AcceptedCelebration({ cfStatus }: {
    cfStatus: { status?: string; verdict?: string; submissionId?: number | string } | null;
}) {
    const celebrateAccepted = useEditorStore((s) => s.celebrateAccepted);
    const celebrationSound = useEditorStore((s) => s.celebrationSound);
    const lastKeyRef = useRef<string | null>(null);

    const accepted = cfStatus?.status === 'done' && (cfStatus.verdict === 'Accepted' || cfStatus.verdict === 'OK');
    const key = accepted ? String(cfStatus?.submissionId ?? 'accepted') : null;

    useEffect(() => {
        if (!key || key === lastKeyRef.current) return;
        lastKeyRef.current = key;
        if (!celebrateAccepted) return;

        if (celebrationSound) playVictoryChime();
        fireConfetti().catch(() => {});
    }, [key, celebrateAccepted, celebrationSound]);

    return null;
}
