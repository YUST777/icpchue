
const { Client } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './next-app/.env' });

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '01234567890123456789012345678901';

// Match logic from lib/encryption.ts
const createBlindIndex = (value) => {
    if (!value) return null;
    const normalized = value.toString().toLowerCase().trim();
    return crypto.createHmac('sha256', DB_ENCRYPTION_KEY).update(normalized).digest('hex');
};

const encrypt = (text) => {
    // Basic AES encryption shim if needed, but for now we just store plain if logic permits
    // Actually the app expects encrypted email.
    // Let's rely on the fact that decrypt returns user.email if decryption fails?
    // encryption.ts: "const decryptedEmail = decrypt(user.email) || user.email;"
    // So plain text is fine for fallback.
    return text;
};

async function seed() {
    console.log('Connecting to DB...', process.env.DATABASE_URL);
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    await client.connect();

    const email = process.env.ADMIN_EMAIL || 'admin@icpchue.com';
    const password = process.env.ADMIN_PASSWORD || 'REPLACE_WITH_SECURE_PASSWORD';
    const hashedPassword = await bcrypt.hash(password, 10);
    const blindIndex = createBlindIndex(email);

    console.log(`Seeding User: ${email}`);
    console.log(`Blind Index: ${blindIndex}`);

    try {
        const queryText = `
            INSERT INTO users (
                email, 
                password_hash, 
                email_blind_index, 
                role, 
                is_verified,
                profile_visibility
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;

        const values = [email, hashedPassword, blindIndex, 'admin', true, 'public'];

        await client.query(queryText, values);
        console.log('✅ User seeded successfully!');
    } catch (e) {
        if (e.code === '23505') {
            console.log('User already exists, skipping.');
        } else {
            console.error('Error seeding:', e);
        }
    } finally {
        await client.end();
    }
}

seed();
