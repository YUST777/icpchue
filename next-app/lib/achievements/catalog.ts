// Every achievement the site can award: name, art and rarity. Shared by the
// unlock toast, the reveal modal and public profiles.

export type AchievementTier = 'common' | 'rare' | 'legendary';

export interface AchievementMeta {
    name: string;
    desc: string;
    imageSrc: string;
    tier: AchievementTier;
}

const IMG = '/images/achievements/';

export const ACHIEVEMENT_META: Record<string, AchievementMeta> = {
    welcome: { name: 'Welcome Badge', desc: 'Joined the ICPC HUE community', imageSrc: `${IMG}badges/welcome.webp`, tier: 'common' },
    instructor: { name: 'Instructor', desc: 'Teaches at ICPC HUE', imageSrc: `${IMG}badges/instructor.webp`, tier: 'legendary' },
    'rank1-march-2026': { name: 'Rank 1 · March 2026', desc: 'Held Rank 1 on the leaderboard in March 2026', imageSrc: `${IMG}badges/rank1-march-2026.webp`, tier: 'legendary' },

    'hello-world': { name: 'Hello, World', desc: 'Your first accepted solution', imageSrc: `${IMG}badges/hello-world.webp`, tier: 'common' },
    'streak-3': { name: 'On Fire · 3', desc: 'Solved problems 3 days in a row', imageSrc: `${IMG}badges/streak-3.webp`, tier: 'common' },
    'streak-7': { name: 'On Fire · 7', desc: 'Solved problems 7 days in a row', imageSrc: `${IMG}badges/streak-7.webp`, tier: 'common' },
    'streak-14': { name: 'On Fire · 14', desc: 'Solved problems 14 days in a row', imageSrc: `${IMG}badges/streak-14.webp`, tier: 'rare' },
    'streak-30': { name: 'On Fire · 30', desc: 'Solved problems 30 days in a row', imageSrc: `${IMG}badges/streak-30.webp`, tier: 'rare' },
    'streak-60': { name: 'On Fire · 60', desc: 'Solved problems 60 days in a row', imageSrc: `${IMG}badges/streak-60.webp`, tier: 'legendary' },
    'disciplined-7': { name: 'Disciplined', desc: 'Logged your study 7 days in a row', imageSrc: `${IMG}badges/disciplined-7.webp`, tier: 'rare' },
    'disciplined-program': { name: 'Iron Discipline', desc: 'Logged every day of the 8-week program', imageSrc: `${IMG}badges/disciplined-program.webp`, tier: 'legendary' },
    comeback: { name: 'Comeback Kid', desc: 'Came back and solved again after a week away', imageSrc: `${IMG}badges/comeback.webp`, tier: 'common' },
    dev: { name: 'Dev', desc: 'Had a pull request merged into the icpchue.com repository', imageSrc: `${IMG}badges/dev.webp`, tier: 'rare' },
    mentor: { name: 'Mentor', desc: 'Guides trainees at ICPC HUE', imageSrc: `${IMG}badges/mentor.webp`, tier: 'legendary' },
};

// One badge per Level 0 topic sheet (the three "General" sheets have none).
export const LEVEL0_SHEET_BADGES = [
    { id: 'sheet-1', name: 'Data Types & Conditions' },
    { id: 'sheet-2', name: 'Loops' },
    { id: 'sheet-3', name: 'Arrays' },
    { id: 'sheet-4', name: 'Strings' },
    { id: 'sheet-5', name: 'Functions' },
    { id: 'sheet-6', name: 'Math & Geometry' },
    { id: 'sheet-7', name: 'Recursion' },
] as const;

for (const sheet of LEVEL0_SHEET_BADGES) {
    ACHIEVEMENT_META[sheet.id] = {
        name: sheet.name,
        desc: `Solved every problem in ${sheet.name}`,
        imageSrc: `${IMG}badges/${sheet.id}.webp`,
        tier: 'rare',
    };
}

// Codeforces ranks, lowest first. A badge is earned once the student's best rating reaches `min`.
export const CF_RANK_BADGES = [
    { id: 'cf-newbie', name: 'Newbie', min: 1, tier: 'common' },
    { id: 'cf-pupil', name: 'Pupil', min: 1200, tier: 'common' },
    { id: 'cf-specialist', name: 'Specialist', min: 1400, tier: 'rare' },
    { id: 'cf-expert', name: 'Expert', min: 1600, tier: 'rare' },
    { id: 'cf-candidate-master', name: 'Candidate Master', min: 1900, tier: 'rare' },
    { id: 'cf-master', name: 'Master', min: 2100, tier: 'legendary' },
    { id: 'cf-international-master', name: 'International Master', min: 2300, tier: 'legendary' },
    { id: 'cf-grandmaster', name: 'Grandmaster', min: 2400, tier: 'legendary' },
    { id: 'cf-international-grandmaster', name: 'International Grandmaster', min: 2600, tier: 'legendary' },
    { id: 'cf-legendary-grandmaster', name: 'Legendary Grandmaster', min: 3000, tier: 'legendary' },
] as const;

for (const rank of CF_RANK_BADGES) {
    ACHIEVEMENT_META[rank.id] = {
        name: `Codeforces ${rank.name}`,
        desc: rank.min === 1 ? 'Got a Codeforces rating' : `Reached ${rank.min}+ rating on Codeforces`,
        imageSrc: `${IMG}badges/${rank.id}.webp`,
        tier: rank.tier,
    };
}

// Season badges: being part of ICPC HUE in that year.
export const SEASON_BADGES = [
    { id: 'year-2026', name: 'Class of 2026', desc: 'Trained with ICPC HUE in 2026', tier: 'rare' },
    { id: 'year-2027', name: 'Class of 2027', desc: 'Joined ICPC HUE for 2027', tier: 'rare' },
] as const;

for (const season of SEASON_BADGES) {
    ACHIEVEMENT_META[season.id] = { name: season.name, desc: season.desc, imageSrc: `${IMG}badges/${season.id}.webp`, tier: season.tier };
}

export const STREAK_TIERS = [3, 7, 14, 30, 60] as const;

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' } as const;

/** Monthly podium badges have one id per month and place: podium-2026-10-1. */
const PODIUM_ID = /^podium-(\d{4})-(\d{2})-([123])$/;

export function isPodiumId(id: string): boolean {
    return PODIUM_ID.test(id);
}

/** Catalog entry for any achievement id, including the per-month podium badges. */
export function getAchievementMeta(id: string): AchievementMeta | undefined {
    const fixed = ACHIEVEMENT_META[id];
    if (fixed) return fixed;
    const match = PODIUM_ID.exec(id);
    if (!match) return undefined;
    const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const place = Number(match[3]) as 1 | 2 | 3;
    return {
        name: `${month} · ${ORDINAL[place]} place`,
        desc: `Finished ${ORDINAL[place]} on the Level 0 leaderboard in ${month}`,
        imageSrc: `${IMG}badges/podium-${place}.webp`,
        tier: place === 1 ? 'legendary' : 'rare',
    };
}

export interface AchievementHowTo { how: string; href?: string; cta?: string }

/** Plain-language steps for earning an achievement, and where on the site to do it. */
export function getAchievementHowTo(id: string): AchievementHowTo {
    const sheets = { href: '/dashboard/sheets', cta: 'Open training sheets' };
    if (id === 'welcome') return { how: 'Given automatically when you join ICPC HUE.' };
    if (id === 'instructor') return { how: 'Given to the instructors who teach ICPC HUE.' };
    if (id === 'dev') return { how: 'Get a pull request merged into the icpchue.com repository on GitHub. Open an issue or a PR, and once it is merged the badge is added.', href: 'https://github.com/YUST777/icpchue', cta: 'Open the repository' };
    if (id === 'mentor') return { how: 'Given to the mentors who guide trainees at ICPC HUE.' };
    if (id === 'rank1-march-2026') return { how: 'Awarded for holding Rank 1 on the leaderboard in March 2026. That campaign has ended, so it is no longer available.' };
    if (id === 'hello-world') return { how: 'Get your first accepted solution on any training problem.', ...sheets };
    if (id === 'comeback') return { how: 'Solve a problem again after a week away from the sheets.', ...sheets };
    const streak = /^streak-(\d+)$/.exec(id);
    if (streak) return { how: `Solve at least one training problem every day for ${streak[1]} days in a row.`, ...sheets };
    if (id === 'disciplined-7') return { how: 'Fill in your study log in the discipline tracker 7 days in a row.', href: '/dashboard/discipline', cta: 'Open the study log' };
    if (id === 'disciplined-program') return { how: 'Log every single day of the 8-week program in the discipline tracker.', href: '/dashboard/discipline', cta: 'Open the study log' };
    const sheet = LEVEL0_SHEET_BADGES.find(x => x.id === id);
    if (sheet) {
        const letter = 'abcdefg'[Number(sheet.id.split('-')[1]) - 1];
        return { how: `Solve every problem in the Level 0 "${sheet.name}" sheet.`, href: `/dashboard/sheets/level-0/sheet-${letter}`, cta: `Open the ${sheet.name} sheet` };
    }
    const cf = CF_RANK_BADGES.find(x => x.id === id);
    if (cf) return {
        how: cf.min === 1
            ? 'Link your Codeforces handle and take part in a rated contest to get a rating.'
            : `Reach a Codeforces rating of ${cf.min} or higher. Link your handle on your profile or use the Verdict Helper extension; ratings refresh every few hours.`,
        href: '/dashboard/profile', cta: 'Link Codeforces',
    };
    if (id === 'year-2026') return { how: 'Be part of the 2026 ICPC HUE season. It is given to everyone who trained with us this year.' };
    if (id === 'year-2027') return { how: 'Apply for the 2027 Level 0 intake and create your ICPC HUE account.', href: '/apply', cta: 'Apply for Level 0' };
    const podium = /^podium-(?:\d{4}-\d{2}-)?([123])$/.exec(id);
    if (podium) return { how: `Finish ${ORDINAL[Number(podium[1]) as 1 | 2 | 3]} in a month on the Level 0 leaderboard by solving the most problems. It is awarded when the month ends.`, href: '/dashboard/leaderboard', cta: 'See the leaderboard' };
    return { how: ACHIEVEMENT_META[id]?.desc ?? '' };
}
