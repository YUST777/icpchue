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
    welcome: { name: 'Welcome Badge', desc: 'Joined the ICPC HUE community', imageSrc: `${IMG}WELCOME.webp`, tier: 'common' },
    approval: { name: 'Approval Camp', desc: 'Completed all sessions of the Approval Camp', imageSrc: `${IMG}done_approvalcamp.webp`, tier: 'rare' },
    instructor: { name: 'Instructor', desc: 'Teaches at ICPC HUE', imageSrc: `${IMG}instructor.webp`, tier: 'legendary' },
    'rank1-march-2026': { name: 'Rank 1 · March 2026', desc: 'Held Rank 1 on the leaderboard in March 2026', imageSrc: `${IMG}rank1_march.webp`, tier: 'legendary' },

    'hello-world': { name: 'Hello, World', desc: 'Your first accepted solution', imageSrc: `${IMG}hello-world.webp`, tier: 'common' },
    'streak-3': { name: 'On Fire · 3', desc: 'Solved problems 3 days in a row', imageSrc: `${IMG}streak-3.webp`, tier: 'common' },
    'streak-7': { name: 'On Fire · 7', desc: 'Solved problems 7 days in a row', imageSrc: `${IMG}streak-7.webp`, tier: 'common' },
    'streak-14': { name: 'On Fire · 14', desc: 'Solved problems 14 days in a row', imageSrc: `${IMG}streak-14.webp`, tier: 'rare' },
    'streak-30': { name: 'On Fire · 30', desc: 'Solved problems 30 days in a row', imageSrc: `${IMG}streak-30.webp`, tier: 'rare' },
    'streak-60': { name: 'On Fire · 60', desc: 'Solved problems 60 days in a row', imageSrc: `${IMG}streak-60.webp`, tier: 'legendary' },
    'disciplined-7': { name: 'Disciplined', desc: 'Logged your study 7 days in a row', imageSrc: `${IMG}disciplined-7.webp`, tier: 'rare' },
    'disciplined-program': { name: 'Iron Discipline', desc: 'Logged every day of the 8-week program', imageSrc: `${IMG}disciplined-program.webp`, tier: 'legendary' },
    comeback: { name: 'Comeback Kid', desc: 'Came back and solved again after a week away', imageSrc: `${IMG}comeback.webp`, tier: 'common' },
    mentor: { name: 'Mentor', desc: 'Guides trainees at ICPC HUE', imageSrc: `${IMG}mentor.webp`, tier: 'legendary' },
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

export const STREAK_TIERS = [3, 7, 14, 30, 60] as const;
