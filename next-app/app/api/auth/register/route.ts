import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getPool, query } from '@/lib/db/db';
import { encrypt, createBlindIndex } from '@/lib/security/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { redis } from '@/lib/db/redis';
import { sanitizeInput } from '@/lib/security/validation';
import { scraperQueue } from '@/lib/db/queue';

const OTP_ENABLED = process.env.REGISTER_OTP_ENABLED === 'true';

function isValidPassword(password: string): boolean {
    if (password.length < 9) return false;
    if (!/[A-Z]/.test(password)) return false;
    return true;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const limitResult = await rateLimit(`register:${ip}`, 5, 3600);

    if (!limitResult.success) {
        return NextResponse.json({ error: 'Too many registration attempts. Please wait.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { email, password } = body;

        // Validation for credentials
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        if (!isValidPassword(password)) {
            return NextResponse.json({
                error: 'Password must be at least 9 characters with at least one uppercase letter'
            }, { status: 400 });
        }

        const normalizedEmail = sanitizeInput(email).toLowerCase();
        const emailBlindIndex = createBlindIndex(normalizedEmail);

        // Verification Check — Redis first, DB fallback
        if (OTP_ENABLED) {
            const verified = await redis.get(`reg-verified:${normalizedEmail}`);
            if (!verified) {
                // Check DB fallback (user verified but Redis key expired)
                const dbCheck = await query(
                    'SELECT 1 FROM email_verifications WHERE email_blind_index = $1',
                    [emailBlindIndex]
                ).catch(() => ({ rows: [] }));
                if (dbCheck.rows.length === 0) {
                    return NextResponse.json({ error: 'Email not verified. Please complete the verification step.' }, { status: 403 });
                }
            }
        }

        // Preliminary check for returning user by email to skip validation
        const existingAppCheck = await query(
            'SELECT id, name FROM applications WHERE email_blind_index = $1',
            [emailBlindIndex]
        );
        const isReturningByEmail = existingAppCheck.rows.length > 0;

        // Validate application data
        const applicationType = sanitizeInput(body.applicationType || 'trainee');
        const name = sanitizeInput(body.name);
        const faculty = sanitizeInput(body.faculty);
        const studentId = sanitizeInput(body.id);
        const nationalId = sanitizeInput(body.nationalId);
        const studentLevel = sanitizeInput(body.studentLevel);
        const telephone = sanitizeInput(body.telephone);
        const hasLaptop = body.hasLaptop === true || body.hasLaptop === 'true';
        const codeforcesProfile = sanitizeInput(body.codeforcesProfile);
        const leetcodeProfile = sanitizeInput(body.leetcodeProfile);

        if (!isReturningByEmail) {
            if (!name || !faculty || !studentId || !studentLevel || !telephone) {
                return NextResponse.json({ error: 'Missing required profile fields' }, { status: 400 });
            }
        }

        const userAgent = sanitizeInput(req.headers.get('user-agent') || 'unknown').substring(0, 255);
        const telephoneBlindIndex = telephone ? createBlindIndex(telephone) : null;
        const studentIdBlindIndex = studentId ? createBlindIndex(studentId) : null;
        const nationalIdBlindIndex = nationalId ? createBlindIndex(nationalId) : null;

        const pool = getPool();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const existingUser = await client.query(
                'SELECT id FROM users WHERE email_blind_index = $1',
                [emailBlindIndex]
            );

            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
            }

            const existingApp = existingAppCheck;

            // 1. Create Supabase User (for both returning and new users)
            const adminClient = createAdminClient();
            const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
            });

            if (authError || !authData.user) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: authError?.message || 'Failed to create auth account' }, { status: 500 });
            }

            let applicationId: number;
            let userName: string;

            if (existingApp.rows.length > 0) {
                // ===== RETURNING USER: Link to existing application =====
                applicationId = existingApp.rows[0].id;
                userName = existingApp.rows[0].name;

                // Check that no user record already exists for this application
                const existingUserForApp = await client.query(
                    'SELECT id FROM users WHERE application_id = $1',
                    [applicationId]
                );
                if (existingUserForApp.rows.length > 0) {
                    // This application already has a user — shouldn't happen, but safety check
                    await client.query('ROLLBACK');
                    // Clean up the Supabase user we just created
                    await adminClient.auth.admin.deleteUser(authData.user.id);
                    return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
                }
            } else {
                // ===== NEW USER: Create a fresh application =====
                // Validate that no other application has the same phone/student_id
                const dupeCheck = await client.query(
                    'SELECT id FROM applications WHERE telephone_blind_index = $1 OR student_id_blind_index = $2',
                    [telephoneBlindIndex, studentIdBlindIndex]
                );

                if (dupeCheck.rows.length > 0) {
                    const existingAppId = dupeCheck.rows[0].id;
                    
                    // Check if this existing application already has a user account
                    const userForExistingApp = await client.query(
                        'SELECT id FROM users WHERE application_id = $1',
                        [existingAppId]
                    );

                    if (userForExistingApp.rows.length === 0) {
                        // ===== ORPHANED APP FOUND: Claim it and sync all fields =====
                        // Update the existing application with everything provided in the form
                        await client.query(
                            `UPDATE applications SET 
                                email = $1, 
                                email_blind_index = $2,
                                telephone = $3,
                                telephone_blind_index = $4,
                                student_id_blind_index = $5,
                                name = $6,
                                faculty = $7,
                                student_level = $8,
                                national_id = $9,
                                national_id_blind_index = $10,
                                has_laptop = $11,
                                application_type = $12
                             WHERE id = $13`,
                            [
                                encrypt(normalizedEmail),
                                emailBlindIndex,
                                encrypt(telephone),
                                telephoneBlindIndex,
                                studentIdBlindIndex,
                                name,
                                faculty,
                                studentLevel,
                                nationalId ? encrypt(nationalId) : null,
                                nationalIdBlindIndex,
                                hasLaptop ? 1 : 0,
                                applicationType,
                                existingAppId
                            ]
                        );
                        
                        applicationId = existingAppId;
                        userName = name;
                    } else {
                        // Application already has a real user account — truly a duplicate
                        await client.query('ROLLBACK');
                        await adminClient.auth.admin.deleteUser(authData.user.id);
                        return NextResponse.json({ 
                            error: 'An account with this phone or student ID already exists.',
                            code: 'DUPLICATE_ENTRY'
                        }, { status: 409 });
                    }
                } else {
                    // ===== NEW USER: Create a fresh application =====
                    const appSql = `
                        INSERT INTO applications (
                            application_type, name, faculty, student_id, national_id, student_level, 
                            telephone, has_laptop, codeforces_profile, leetcode_profile, email, 
                            ip_address, user_agent, scraping_status,
                            email_blind_index, national_id_blind_index, telephone_blind_index, student_id_blind_index
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                        RETURNING id
                    `;

                    const returnApp = await client.query(appSql, [
                        applicationType,
                        name,
                        faculty,
                        studentId,
                        nationalId ? encrypt(nationalId) : null,
                        studentLevel,
                        encrypt(telephone),
                        hasLaptop ? 1 : 0,
                        codeforcesProfile || null,
                        leetcodeProfile || null,
                        encrypt(normalizedEmail),
                        ip,
                        userAgent,
                        'pending',
                        emailBlindIndex,
                        nationalIdBlindIndex,
                        telephoneBlindIndex,
                        studentIdBlindIndex
                    ]);

                    applicationId = returnApp.rows[0].id;
                    userName = name;
                }
            }
            // 2. Insert User Record (same for both returning and new)
            const encryptedEmail = encrypt(normalizedEmail);
            const userSql = `
                INSERT INTO users (email, email_blind_index, application_id, supabase_uid) 
                VALUES ($1, $2, $3, $4) RETURNING id
            `;
            const returnUser = await client.query(userSql, [encryptedEmail, emailBlindIndex, applicationId, authData.user.id]);
            const newUser = returnUser.rows[0];

            await client.query('COMMIT');

            // Post-transaction jobs
            import('@/lib/services/achievements').then(({ grantAchievement, ACHIEVEMENTS }) =>
                grantAchievement(newUser.id, ACHIEVEMENTS.WELCOME)
            ).catch(() => {});

            if (applicationType === 'trainer') {
                const jobData = { applicationId, leetcodeProfile, codeforcesProfile, applicationType };
                try { await scraperQueue.add('scrape-job', jobData); } catch {}
            } else {
                getPool().query("UPDATE applications SET scraping_status = 'not_applicable' WHERE id = $1", [applicationId]).catch(() => { });
            }

            if (OTP_ENABLED) {
                redis.del(`reg-verified:${normalizedEmail}`).catch(() => {});
                // Also clean up the persistent DB verification so it can't be reused in future
                query('DELETE FROM email_verifications WHERE email_blind_index = $1', [emailBlindIndex]).catch(() => {});
            }

            return NextResponse.json({
                success: true,
                message: 'Registration successful',
                user: {
                    id: newUser.id,
                    email: normalizedEmail,
                    name: userName,
                    applicationId: applicationId,
                },
            }, { status: 201 });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (e) {
        console.error('[Register API Error]', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
