const CryptoJS = require('crypto-js');

const encryptedEmail = process.env.TEST_ENCRYPTED_EMAIL || '';
const key = process.env.DATABASE_ENCRYPTION_KEY;

// Logic from crypto.ts line 34
// const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
// const decrypted = bytes.toString(CryptoJS.enc.Utf8);

try {
    const bytes = CryptoJS.AES.decrypt(encryptedEmail, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    console.log('Decrypted:', decrypted);
} catch (e) {
    console.error('Failed:', e.message);
}
