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

// ---- Arabic names shown in English -------------------------------------------------
// Common first names get their usual Egyptian spelling; anything else is spelled out letter by letter.

const norm = (w: string) => w
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');

const KNOWN: Record<string, string> = {
    محمد: 'Mohamed', احمد: 'Ahmed', محمود: 'Mahmoud', مصطفي: 'Mostafa', علي: 'Ali', حسن: 'Hassan', حسين: 'Hussein',
    ابراهيم: 'Ibrahim', اسماعيل: 'Ismail', اسلام: 'Islam', يوسف: 'Youssef', عمر: 'Omar', خالد: 'Khaled', طارق: 'Tarek',
    عمرو: 'Amr', كريم: 'Karim', هشام: 'Hesham', اشرف: 'Ashraf', شريف: 'Sherif', رامي: 'Ramy', هازم: 'Hazem', حازم: 'Hazem',
    عادل: 'Adel', فادي: 'Fady', مينا: 'Mina', بيشوي: 'Bishoy', زياد: 'Ziad', انس: 'Anas', باسم: 'Bassem', باسل: 'Basel',
    صالح: 'Saleh', سعيد: 'Saeed', وليد: 'Walid', سامح: 'Sameh', سامي: 'Sami', سيف: 'Seif', ياسين: 'Yassin', يحيي: 'Yahya',
    مروان: 'Marwan', مازن: 'Mazen', معاذ: 'Moaz', نور: 'Nour', مريم: 'Mariam', فاطمه: 'Fatma', ساره: 'Sara', سارة: 'Sara',
    ياسمين: 'Yasmin', ندي: 'Nada', هنا: 'Hana', ايه: 'Aya', رنا: 'Rana', رانيا: 'Rania', منه: 'Menna', منى: 'Mona', مني: 'Mona',
    مروه: 'Marwa', اسراء: 'Esraa', ايمان: 'Eman', الاء: 'Alaa', علاء: 'Alaa', هبه: 'Heba', دينا: 'Dina', نورهان: 'Nourhan',
    ميرنا: 'Merna', مودة: 'Mawada', رحمه: 'Rahma', جني: 'Jenny', جنه: 'Jannah', سلمي: 'Salma', سلمى: 'Salma', شروق: 'Shorouk',
    هدي: 'Hoda', هدى: 'Hoda', امل: 'Amal', امنيه: 'Omnia', اميره: 'Amira', ريم: 'Reem', ريهام: 'Reham', ساميه: 'Samia',
    عبدالله: 'Abdallah', عبدالرحمن: 'Abdelrahman', عبدالعزيز: 'Abdelaziz', عبدالفتاح: 'Abdelfattah', عبدالمنعم: 'Abdelmonem',
    عبدالحميد: 'Abdelhamid', عبدالكريم: 'Abdelkarim', عبدالناصر: 'Abdelnasser', عبدالسلام: 'Abdelsalam', عبدالرازق: 'Abdelrazek',
    ماهر: 'Maher', ماجد: 'Maged', مجدي: 'Magdy', سمير: 'Samir', سمر: 'Samar', سعد: 'Saad', سعيد_: 'Saeed', جمال: 'Gamal',
    جابر: 'Gaber', جبر: 'Gabr', شاطا: 'Shata', شطا: 'Shata', فتحي: 'Fathy', فتح: 'Fath', فرج: 'Farag', فؤاد: 'Fouad', فواد: 'Fouad',
    رضا: 'Reda', رمضان: 'Ramadan', رجب: 'Ragab', زكي: 'Zaki', زكريا: 'Zakaria', زين: 'Zein', سليمان: 'Soliman', سلامه: 'Salama',
    شعبان: 'Shaaban', صبري: 'Sabry', صلاح: 'Salah', طه: 'Taha', عاطف: 'Atef', عصام: 'Essam', عماد: 'Emad', عثمان: 'Osman',
    غازي: 'Ghazi', فاروق: 'Farouk', قاسم: 'Kassem', كمال: 'Kamal', لطفي: 'Lotfy', متولي: 'Metwally', مختار: 'Mokhtar',
    مرسي: 'Morsy', منصور: 'Mansour', مهدي: 'Mahdy', موسي: 'Moussa', نبيل: 'Nabil', نصر: 'Nasr', هاني: 'Hany', وائل: 'Wael',
    ياسر: 'Yasser', يونس: 'Younes', ايهاب: 'Ehab', ايمن: 'Ayman', بهاء: 'Bahaa', بلال: 'Belal', تامر: 'Tamer', ثروت: 'Tharwat',
    حاتم: 'Hatem', حمدي: 'Hamdy', حمزه: 'Hamza', خليل: 'Khalil', ربيع: 'Rabie', رفعت: 'Refaat', رشدي: 'Roshdy', ماركو: 'Marco',
    مؤمن: 'Moamen', مومن: 'Moamen', منير: 'Mounir', مهند: 'Mohannad', ناصر: 'Nasser', نادر: 'Nader', نبيه: 'Nabiha', ابانوب: 'Abanoub',
    رحمن: 'Rahman', عزيز: 'Aziz', فتاح: 'Fattah', منعم: 'Monem', حميد: 'Hamid', سلام: 'Salam', رازق: 'Razek', رحيم: 'Rahim',
    لطيف: 'Latif', قادر: 'Kader', وهاب: 'Wahab', باسط: 'Baset', حكيم: 'Hakim', جواد: 'Gawad', هادي: 'Hady', ستار: 'Sattar',
    ابو: 'Abu', ابن: 'Ibn', بن: 'Bin', بكر: 'Bakr', سيد: 'Sayed', حمد: 'Hamad', زكري: 'Zekry', دين: 'Din',
    كيرلس: 'Kyrillos', مارك: 'Mark', بيتر: 'Peter', جورج: 'George', ميشيل: 'Michel', ديفيد: 'David', يوحنا: 'Youhanna',
};

const LETTERS: Record<string, string> = {
    ب: 'b', ت: 't', ث: 'th', ج: 'g', ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd',
    ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ء: '',
};
const VOWELS: Record<string, string> = { ا: 'a', و: 'o', ي: 'i' };

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** One Arabic word as English letters. Unknown words get an "e" between consonants so they stay readable. */
function arabicWord(word: string): string {
    const w = norm(word);
    if (KNOWN[w]) return KNOWN[w];
    if (w.startsWith('ال') && w.length > 3) return `El${arabicWord(w.slice(2)).toLowerCase()}`.replace(/^El(.)/, (_, c) => `El${c}`);
    let out = '';
    let lastVowel = true;
    for (const ch of w) {
        if (VOWELS[ch]) { out += VOWELS[ch]; lastVowel = true; continue; }
        const l = LETTERS[ch];
        if (l === undefined) continue;
        if (!lastVowel && out) out += 'e';
        out += l;
        lastVowel = false;
    }
    return capital(out);
}

/** Arabic words to English words. "عبد" joins the next word: Abdel + rahman. */
function arabicToLatin(words: string[]): string[] {
    const out: string[] = [];
    for (let i = 0; i < words.length; i++) {
        const w = norm(words[i]);
        if (w === 'عبد' && i + 1 < words.length) {
            const next = norm(words[i + 1]);
            out.push(next === 'الله' ? 'Abdallah' : `Abdel${arabicWord(next.replace(/^ال/, '')).toLowerCase()}`);
            i++;
        } else {
            out.push(arabicWord(words[i]));
        }
    }
    return out;
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
    const tokens = chosen.split(' ').filter(Boolean);
    // Arabic-only names are shown in English too, so every public screen reads in one script.
    const words = isArabic ? arabicToLatin(tokens) : tokens.map(titleCaseLatin);
    return groupNames(words, LATIN_JOINERS).slice(0, count).join(' ');
}
