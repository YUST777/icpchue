// Student names arrive in every shape: "Merna Walid/ميرنا وليد", "مودة /mawada",
// "عمر فتح الله Omar Fathallah", all-lowercase Latin, Arabic only. Public screens
// (leaderboards, profiles) show them as one script, up to three names, title-cased.

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

// A compound first element joins the word after it: "Abd El Rahman", "Abu Bakr", "عبد الرحمن".
const LATIN_JOINERS = new Set(['abd', 'abdel', 'abdul', 'abu', 'abo', 'bin', 'ibn', 'ben', 'al', 'el']);
const ARABIC_JOINERS = new Set(['عبد', 'ابو', 'أبو', 'ابن', 'بن']);

function letters(text: string, script: RegExp): number {
    return [...text].filter(ch => script.test(ch)).length;
}

/** Splits "Arabic/English" or "Arabic English" into script groups. */
function splitScripts(raw: string): string[] {
    const parts = raw.split(/[\/|\\]/).map(p => p.trim()).filter(Boolean);
    const out: string[] = [];
    for (const part of parts) {
        const hasAr = ARABIC.test(part), hasEn = LATIN.test(part);
        if (!(hasAr && hasEn)) { out.push(part); continue; }
        // No slash between the scripts: split the words by script.
        const ar: string[] = [], en: string[] = [];
        for (const word of part.split(/\s+/)) (ARABIC.test(word) ? ar : en).push(word);
        out.push(ar.join(' '), en.join(' '));
    }
    return out;
}

function titleCaseLatin(word: string): string {
    return word
        .split('-')
        .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join('-');
}

/** Groups words into names, keeping compounds such as "Abd El Rahman" together. */
function groupNames(words: string[], joiners: Set<string>): string[] {
    const names: string[] = [];
    for (let i = 0; i < words.length; i++) {
        let name = words[i];
        while (joiners.has(words[i].toLowerCase()) && i + 1 < words.length) {
            name += ` ${words[i + 1]}`;
            i++;
        }
        names.push(name);
    }
    return names;
}

/**
 * Returns up to `count` names in a single script, preferring English when the
 * student gave both. Falls back to "Member" for junk such as "21324121".
 */
export function formatDisplayName(raw: string | null | undefined, count = 3): string {
    if (!raw) return 'Member';
    const candidates = splitScripts(String(raw).normalize('NFKC'))
        .map(part => part.replace(/[^\p{L}\p{M}\s'.-]/gu, ' ').replace(/\s+/g, ' ').trim())
        .filter(part => letters(part, LATIN) + letters(part, ARABIC) >= 3);
    if (candidates.length === 0) return 'Member';

    const english = candidates.filter(c => LATIN.test(c) && !ARABIC.test(c));
    const pool = english.length > 0 ? english : candidates;
    // The fullest version wins when both scripts repeat the same name.
    const chosen = pool.reduce((best, c) => (c.split(' ').length > best.split(' ').length ? c : best));

    const isArabic = ARABIC.test(chosen);
    const words = chosen.split(' ').filter(Boolean).map(w => (isArabic ? w : titleCaseLatin(w)));
    return groupNames(words, isArabic ? ARABIC_JOINERS : LATIN_JOINERS).slice(0, count).join(' ');
}
