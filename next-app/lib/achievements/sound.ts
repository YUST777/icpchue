type Tier = 'common' | 'rare' | 'legendary';

let ctx: AudioContext | null = null;
const played = new Set<string>();

function context(): AudioContext | null {
    try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx ??= new Ctor();
        if (ctx.state === 'suspended') void ctx.resume();
        return ctx;
    } catch { return null; }
}

/** A short note with a soft attack and a long, bell-like tail. */
function note(out: AudioNode, ac: AudioContext, freq: number, at: number, len: number, gain: number, type: OscillatorType = 'sine') {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(amp).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.05);
}

const hz = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

/**
 * The unlock jingle. Common is a two-note chime, rare adds a rising arpeggio,
 * legendary is a full fanfare with a shimmer. Each badge plays once per page load.
 */
export function playAchievementSound(id: string, tier: Tier) {
    if (typeof window === 'undefined' || played.has(id)) return;
    try { if (localStorage.getItem('achievementSound') === 'off') return; } catch { /* ignore */ }
    played.add(id);
    const quiet = window.matchMedia?.('(max-width: 639px)').matches ?? false;
    const ac = context();
    if (!ac) return;
    const t = ac.currentTime + 0.05;
    // Phones are held close and used in public: quieter, and no long tail.
    const out = ac.createGain();
    out.gain.value = quiet ? 0.45 : 1;
    out.connect(ac.destination);

    if (tier === 'common') {
        note(out, ac, hz(7), t, 0.9, 0.16);          // E5
        note(out, ac, hz(14), t + 0.12, 1.1, 0.14);  // B5
        note(out, ac, hz(14) * 2, t + 0.12, 0.6, 0.03, 'triangle');
    } else if (tier === 'rare') {
        [0, 4, 7, 12, 16].forEach((s, i) => note(out, ac, hz(s + 3), t + i * 0.09, 1.0, 0.14));
        note(out, ac, hz(28), t + 0.5, 1.2, 0.06, 'triangle');
    } else {
        // Open fifth underneath, then a rising run, then a high shimmer.
        note(out, ac, hz(-21), t, 1.8, 0.16, 'triangle');
        note(out, ac, hz(-14), t, 1.8, 0.12, 'triangle');
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => note(out, ac, hz(s), t + 0.08 + i * 0.08, 1.4, 0.13));
        [31, 36, 40].forEach((s, i) => note(out, ac, hz(s), t + 0.75 + i * 0.07, 1.6, 0.05, 'triangle'));
    }
}
