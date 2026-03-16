const CryptoJS = require('crypto-js');

const email = process.env.TEST_EMAIL || 'user@example.com';
const key = process.env.BLIND_INDEX_SALT; // BLIND_INDEX_SALT

// Logic from crypto.ts keys
// const blindIndexSalt = process.env.BLIND_INDEX_SALT || encryptionKey;
// return CryptoJS.HmacSHA256(normalized, blindIndexSalt).toString(CryptoJS.enc.Hex);

const normalized = email.toLowerCase().trim();
const blindIndex = CryptoJS.HmacSHA256(normalized, key).toString(CryptoJS.enc.Hex);

console.log(blindIndex);
