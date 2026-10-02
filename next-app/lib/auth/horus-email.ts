/**
 * Horus University email normalization shared by the /apply page and the
 * OTP/register API routes.
 *
 * Students type their address on phones with Arabic keyboards, paste it from
 * WhatsApp/Facebook, or only type their student ID. Those inputs can carry
 * invisible direction marks, zero-width spaces, full-width characters, or
 * Arabic-Indic digits that look identical to a valid address but fail a plain
 * regex. Normalizing on both the client and the server keeps every layer
 * agreeing on the same canonical address.
 */

export const HORUS_EMAIL_DOMAIN = 'horus.edu.eg';

const HORUS_EMAIL_RE = /^[a-z0-9._%+-]+@horus\.edu\.eg$/;
const STUDENT_ID_RE = /^\d{5,12}$/;

// Invisible formatting characters (direction marks, zero-width chars, BOM,
// soft hyphen) and every kind of whitespace, including NBSP.
const INVISIBLE_OR_SPACE_RE = /[\p{Cf}\p{Z}\s\u00AD]/gu;

export function toAsciiDigits(value: string): string {
    return value
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0)); // Extended (Persian/Urdu)
}

/** Returns the canonical lowercase address, or the cleaned input when it is not a Horus address. */
export function normalizeHorusEmail(raw: unknown): string {
    if (typeof raw !== 'string') return '';

    let value = toAsciiDigits(raw.normalize('NFKC'))
        .replace(INVISIBLE_OR_SPACE_RE, '')
        .replace(/[\uFF20\uFE6B]/g, '@')
        .replace(/[\u3002\uFF0E\uFF61]/g, '.')
        .toLowerCase();

    // Mobile keyboards often add a trailing dot or comma after autocomplete.
    value = value.replace(/[.,;]+$/, '');

    // A bare student ID is the most common input on /apply.
    if (STUDENT_ID_RE.test(value)) return `${value}@${HORUS_EMAIL_DOMAIN}`;

    const at = value.lastIndexOf('@');
    if (at <= 0) return value;

    const local = value.slice(0, at).replace(/^@+|@+$/g, '');
    const domain = value.slice(at + 1);

    // Student addresses are "<id>@horus.edu.eg". Repair common domain typos
    // (hours.edu.eg, horus.edu, horus.eg, horus.edu.eg.com, ...) only when the
    // local part is a student ID, so we never redirect a different mailbox.
    if (STUDENT_ID_RE.test(local) && domain !== HORUS_EMAIL_DOMAIN && (domain === '' || /^h[ou]{1,2}r[ou]{0,2}s\b/.test(domain))) {
        return `${local}@${HORUS_EMAIL_DOMAIN}`;
    }

    return `${local}@${domain}`;
}

export function isHorusEmail(email: string): boolean {
    return email.length <= 254 && HORUS_EMAIL_RE.test(email);
}
