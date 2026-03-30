import crypto from 'crypto';
import speakeasy from 'speakeasy';

/**
 * Application-level encryption using Node.js built-in crypto.
 *
 * NEW data: AES-256-GCM (authenticated encryption, no CryptoJS dependency)
 * OLD data: Legacy CryptoJS AES-CBC format (U2FsdGVkX1...) is still decryptable
 *           for backward compatibility until a full data migration is done.
 *
 * Format of new ciphertext: base64( iv[12] + authTag[16] + ciphertext )
 * Prefix: "aes256gcm:" to distinguish from legacy format.
 */

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    console.warn('⚠️ WARNING: DB_ENCRYPTION_KEY not set. Encryption/decryption will fail.');
}

const BLIND_INDEX_SALT = process.env.BLIND_INDEX_SALT || ENCRYPTION_KEY;
if (!BLIND_INDEX_SALT) {
    console.warn('⚠️ WARNING: BLIND_INDEX_SALT not set. Blind index lookups will fail.');
}
const TOTP_SECRET = process.env.TOTP_SECRET;

// Derive a 32-byte key from the passphrase (consistent, deterministic)
let derivedKey: Buffer | null = null;
function getKey(): Buffer | null {
    if (!ENCRYPTION_KEY) return null;
    if (!derivedKey) {
        derivedKey = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    }
    return derivedKey;
}

// ─── NEW: AES-256-GCM encrypt ───────────────────────────────────────

export const encrypt = (text: string | null | undefined): string | null => {
    if (!text) return null;
    const key = getKey();
    if (!key) return null;

    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    // Pack: iv(12) + authTag(16) + ciphertext
    const packed = Buffer.concat([iv, authTag, encrypted]);
    return 'aes256gcm:' + packed.toString('base64');
};

// ─── Decrypt: new format first, legacy CryptoJS fallback ────────────

export const decrypt = (encryptedText: string | null | undefined): string | null => {
    if (!encryptedText) return null;
    const key = getKey();
    if (!key) return null;

    try {
        // New format: "aes256gcm:<base64>"
        if (encryptedText.startsWith('aes256gcm:')) {
            const packed = Buffer.from(encryptedText.slice(10), 'base64');
            if (packed.length < 28) return null; // iv(12) + tag(16) = 28 minimum

            const iv = packed.subarray(0, 12);
            const authTag = packed.subarray(12, 28);
            const ciphertext = packed.subarray(28);

            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            return decrypted.toString('utf8');
        }

        // Legacy format: CryptoJS AES-CBC (starts with "U2FsdGVkX1")
        if (encryptedText.startsWith('U2FsdGVkX1')) {
            return decryptLegacyCryptoJS(encryptedText);
        }

        // Unknown format
        console.warn('Decrypt: unrecognized ciphertext format');
        return null;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Decryption error:', msg);
        return null;
    }
};

/**
 * Decrypt legacy CryptoJS AES-CBC ciphertext.
 * CryptoJS format: base64("Salted__" + salt[8] + ciphertext)
 * Key derivation: EVP_BytesToKey (MD5-based) from passphrase + salt → key + iv
 */
function decryptLegacyCryptoJS(b64: string): string | null {
    if (!ENCRYPTION_KEY) return null;

    const raw = Buffer.from(b64, 'base64');
    // First 8 bytes: "Salted__", next 8: salt, rest: ciphertext
    const magic = raw.subarray(0, 8).toString('utf8');
    if (magic !== 'Salted__') return null;

    const salt = raw.subarray(8, 16);
    const ciphertext = raw.subarray(16);

    // EVP_BytesToKey: derive 32-byte key + 16-byte IV from passphrase + salt using MD5
    const passphrase = Buffer.from(ENCRYPTION_KEY, 'utf8');
    const derived = evpBytesToKey(passphrase, salt, 32, 16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', derived.key, derived.iv);
    decipher.setAutoPadding(true);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const result = decrypted.toString('utf8');
    return result || null;
}

/** Replicate OpenSSL EVP_BytesToKey (MD5-based KDF used by CryptoJS) */
function evpBytesToKey(password: Buffer, salt: Buffer, keyLen: number, ivLen: number): { key: Buffer; iv: Buffer } {
    const totalLen = keyLen + ivLen;
    const blocks: Buffer[] = [];
    let prev = Buffer.alloc(0);

    while (Buffer.concat(blocks).length < totalLen) {
        const hash = crypto.createHash('md5');
        hash.update(prev);
        hash.update(password);
        hash.update(salt);
        prev = hash.digest();
        blocks.push(prev);
    }

    const derived = Buffer.concat(blocks);
    return {
        key: derived.subarray(0, keyLen),
        iv: derived.subarray(keyLen, keyLen + ivLen),
    };
}

// ─── Blind index (HMAC-SHA256, unchanged) ───────────────────────────

export const createBlindIndex = (value: string | null | undefined): string | null => {
    if (!value || !BLIND_INDEX_SALT) return null;
    const normalized = value.toString().toLowerCase().trim();
    return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(normalized).digest('hex');
};

// ─── TOTP verification (unchanged) ──────────────────────────────────

export const verifyTOTP = (token: string): boolean => {
    if (!TOTP_SECRET) {
        console.error('TOTP_SECRET is not defined');
        return false;
    }
    try {
        return speakeasy.totp.verify({
            secret: TOTP_SECRET,
            encoding: 'base32',
            token: token,
            window: 2,
        });
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
};
