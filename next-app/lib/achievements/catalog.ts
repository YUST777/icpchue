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
