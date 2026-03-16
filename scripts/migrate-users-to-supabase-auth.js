#!/usr/bin/env node

/**
 * Migration script: Import existing users from public.users into Supabase auth.users.
 * 
 * For each user:
 *   1. Decrypt their AES-encrypted email using DB_ENCRYPTION_KEY
 *   2. INSERT into auth.users with their existing bcrypt password hash
 *   3. UPDATE public.users.supabase_uid with the new auth.users.id
 *
 * Usage: DB_ENCRYPTION_KEY=... DATABASE_URL=... node scripts/migrate-users-to-supabase-auth.js
 */

import pg from 'pg';
import CryptoJS from 'crypto-js';

const { Pool } = pg;

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DB_ENCRYPTION_KEY) {
    console.error('ERROR: DB_ENCRYPTION_KEY is required');
    process.exit(1);
}
if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
}

let connStr = DATABASE_URL;
if (connStr.includes('sslmode=require')) {
    connStr = connStr.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

function decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, DB_ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted || decrypted.trim() === '') return null;
        return decrypted;
    } catch {
        return null;
    }
}

async function migrate() {
    const client = await pool.connect();

    try {
        const { rows: users } = await client.query(
            'SELECT id, email, password_hash FROM public.users WHERE supabase_uid IS NULL ORDER BY id'
        );

        console.log(`Found ${users.length} users to migrate.\n`);

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (const user of users) {
            const plainEmail = decrypt(user.email);
            if (!plainEmail) {
                console.error(`  [SKIP] User ${user.id}: could not decrypt email`);
                skipped++;
                continue;
            }

            if (!user.password_hash) {
                console.error(`  [SKIP] User ${user.id} (${plainEmail}): no password hash`);
                skipped++;
                continue;
            }

            try {
                const result = await client.query(`
                    INSERT INTO auth.users (
                        instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at, confirmation_token,
                        raw_app_meta_data, raw_user_meta_data
                    ) VALUES (
                        '00000000-0000-0000-0000-000000000000',
                        gen_random_uuid(), 'authenticated', 'authenticated',
                        $1, $2,
                        NOW(), NOW(), NOW(), '',
                        '{"provider":"email","providers":["email"]}',
                        '{}'
                    ) RETURNING id
                `, [plainEmail.toLowerCase().trim(), user.password_hash]);

                const supabaseUid = result.rows[0].id;

                await client.query(
                    'UPDATE public.users SET supabase_uid = $1 WHERE id = $2',
                    [supabaseUid, user.id]
                );

                // Also insert into auth.identities (required by Supabase Auth)
                const emailLower = plainEmail.toLowerCase().trim();
                await client.query(`
                    INSERT INTO auth.identities (
                        id, user_id, provider_id, provider, identity_data,
                        last_sign_in_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1::uuid, $2::text, 'email',
                        jsonb_build_object('sub', $3::text, 'email', $4::text, 'email_verified', true, 'provider', 'email'),
                        NOW(), NOW(), NOW()
                    )
                `, [supabaseUid, emailLower, supabaseUid.toString(), emailLower]);

                console.log(`  [OK] User ${user.id} (${plainEmail}) -> ${supabaseUid}`);
                success++;
            } catch (err) {
                console.error(`  [FAIL] User ${user.id} (${plainEmail}): ${err.message}`);
                failed++;
            }
        }

        console.log(`\n--- Migration Summary ---`);
        console.log(`  Success: ${success}`);
        console.log(`  Skipped: ${skipped}`);
        console.log(`  Failed:  ${failed}`);
        console.log(`  Total:   ${users.length}`);

    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
