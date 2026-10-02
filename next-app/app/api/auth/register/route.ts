import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getPool, query } from '@/lib/db/db';
import { decrypt, encrypt, createBlindIndex } from '@/lib/security/encryption';
import { createAdminClient, findAuthUserByEmail } from '@/lib/supabase/admin';
import { sanitizeInput } from '@/lib/security/validation';
import { scraperQueue } from '@/lib/db/queue';
import { getClientIp } from '@/lib/security/request';

function isValidPassword(password: string): boolean {
    if (password.length < 9) return false;
    if (!/[A-Z]/.test(password)) return false;
    return true;
}

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
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

        if (!/^[^\s@]+@horus\.edu\.eg$/i.test(normalizedEmail)) {
            return NextResponse.json({ error: 'Use your Horus University email address.' }, { status: 400 });
        }

        // Supabase Auth owns the OTP and marks the user confirmed after the
        // code is verified. Only users created by our OTP endpoint may be
        // linked to an application here; existing accounts must log in.
        const authUser = await findAuthUserByEmail(normalizedEmail);
        if (!authUser) {
            return NextResponse.json({ error: 'Email not verified. Please complete the verification step.' }, { status: 403 });
        }
        if (authUser.user_metadata?.icpchue_registration !== true) {
            return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
        }
        if (!authUser.email_confirmed_at) {
            return NextResponse.json({ error: 'Email not verified. Please complete the verification step.' }, { status: 403 });
        }

        // Parse profile data before resolving the registration source. Level 1
        // registrations are stored in their own intake table until an account
        // is created; the legacy /register flow keeps using applications.
        const applicationType = sanitizeInput(body.applicationType || 'trainee');
        const registrationFlow = sanitizeInput(body.registrationFlow);
        let name = sanitizeInput(body.name);
        let faculty = sanitizeInput(body.faculty);
        let studentId = sanitizeInput(body.id);
        let nationalId = sanitizeInput(body.nationalId);
        let studentLevel = sanitizeInput(body.studentLevel);
        let telephone = sanitizeInput(body.telephone);
        let hasLaptop = body.hasLaptop === true || body.hasLaptop === 'true';
        let codeforcesProfile = sanitizeInput(body.codeforcesProfile);
        let leetcodeProfile = sanitizeInput(body.leetcodeProfile);

        let level1Registration: any = null;
        let existingAppCheck: { rows: any[] } = { rows: [] };

        if (registrationFlow === 'level1') {
            const lookupParts = ['email_blind_index = $1'];
            const lookupParams: Array<string | null> = [emailBlindIndex];
            const addLookup = (column: string, value: string) => {
                if (!value) return;
                lookupParams.push(createBlindIndex(value));
                lookupParts.push(`${column} = $${lookupParams.length}`);
            };
            addLookup('student_id_blind_index', studentId);
            addLookup('national_id_blind_index', nationalId);
            addLookup('telephone_blind_index', telephone);

            const intakeResult = await query(
                `SELECT id, name, faculty, student_id, national_id, academic_level,
                        telephone, has_laptop, codeforces_profile, leetcode_profile,
                        email, email_blind_index, application_id, status
                   FROM level1_training_registrations
                  WHERE season_year = 2027
                    AND (${lookupParts.join(' OR ')})
                  ORDER BY submitted_at DESC
                  LIMIT 1`,
                lookupParams
            );
            level1Registration = intakeResult.rows[0] || null;

            if (!level1Registration) {
                return NextResponse.json({
                    error: 'Complete the Level 1 training registration before creating an account.'
                }, { status: 400 });
            }

            if (level1Registration.status === 'cancelled') {
                return NextResponse.json({ error: 'This Level 1 registration is no longer active.' }, { status: 409 });
            }

            if (level1Registration.email_blind_index && level1Registration.email_blind_index !== emailBlindIndex) {
                return NextResponse.json({ error: 'This Level 1 registration is linked to a different email.' }, { status: 409 });
            }

            // The intake record is canonical. Do not let a modified client
            // request replace the student's identity during account linking.
            name = level1Registration.name;
            faculty = level1Registration.faculty;
            studentId = decrypt(level1Registration.student_id) || level1Registration.student_id;
            nationalId = decrypt(level1Registration.national_id) || level1Registration.national_id;
            studentLevel = level1Registration.academic_level;
            telephone = decrypt(level1Registration.telephone) || level1Registration.telephone;
            hasLaptop = Boolean(level1Registration.has_laptop);
            codeforcesProfile = level1Registration.codeforces_profile || '';
            leetcodeProfile = level1Registration.leetcode_profile || '';
        } else {
            // Preliminary check for returning users in the legacy flow.
            existingAppCheck = await query(
                'SELECT id, name FROM applications WHERE email_blind_index = $1',
                [emailBlindIndex]
            );
        }

        const isReturningByEmail = registrationFlow === 'level1'
            ? Boolean(level1Registration)
            : existingAppCheck.rows.length > 0;

        if (!isReturningByEmail) {
            if (!name || !faculty || !studentId || !studentLevel || !telephone) {
                return NextResponse.json({ error: 'Missing required profile fields' }, { status: 400 });
            }
        }

        // Level 1 applications collect a national ID before account creation.
        // Keep this server-side so the requirement cannot be bypassed by a
        // modified browser request; the legacy /register flow remains intact.
        if (registrationFlow === 'level1' && (!/^\d{14}$/.test(nationalId) || !/^[23]/.test(nationalId))) {
            return NextResponse.json({ error: 'A valid 14-digit national ID is required for Level 1 registration.' }, { status: 400 });
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
                'SELECT id FROM users WHERE email_blind_index = $1 OR supabase_uid = $2',
                [emailBlindIndex, authUser.id]
            );

            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
            }

            const existingApp = existingAppCheck;

            // 1. The Auth user was created by Supabase's OTP request. Attach
            // the password only after the code has been verified.
            const adminClient = createAdminClient();
            const { data: authData, error: authError } = await adminClient.auth.admin.updateUserById(authUser.id, {
                password,
                email_confirm: true,
            });

            if (authError || !authData.user) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: authError?.message || 'Failed to create auth account' }, { status: 500 });
            }

            let applicationId: number;
            let userName: string;

            if (registrationFlow === 'level1') {
                // Lock the intake row so two tabs cannot create two accounts or
                // two compatibility applications for the same registration.
                const lockedIntake = await client.query(
                    `SELECT id, application_id, name
                       FROM level1_training_registrations
                      WHERE id = $1 AND season_year = 2027
                      FOR UPDATE`,
                    [level1Registration.id]
                );
                if (lockedIntake.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ error: 'Level 1 registration could not be found.' }, { status: 409 });
                }

                const existingUserForIntake = await client.query(
                    'SELECT id FROM users WHERE application_id = $1',
                    [lockedIntake.rows[0].application_id]
                );
                if (existingUserForIntake.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ error: 'This Level 1 registration already has an account. Please login.' }, { status: 409 });
                }

                applicationId = lockedIntake.rows[0].application_id;
                if (applicationId) {
                    const applicationResult = await client.query(
                        'SELECT id FROM applications WHERE id = $1 FOR UPDATE',
                        [applicationId]
                    );
                    if (applicationResult.rows.length === 0) applicationId = 0;
                }

                if (!applicationId) {
                    const level1ApplicationResult = await client.query(`
                        INSERT INTO applications (
                            application_type, name, faculty, student_id, national_id, student_level,
                            telephone, has_laptop, codeforces_profile, leetcode_profile, email,
                            ip_address, user_agent, scraping_status,
                            email_blind_index, national_id_blind_index, telephone_blind_index,
                            student_id_blind_index, season_year
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                        RETURNING id
                    `, [
                        'level1_training_2027',
                        name,
                        faculty,
                        studentId,
                        nationalId ? encrypt(nationalId) : null,
                        studentLevel,
                        encrypt(telephone),
                        hasLaptop,
                        codeforcesProfile || null,
                        leetcodeProfile || null,
                        encrypt(normalizedEmail),
                        ip,
                        userAgent,
                        'not_applicable',
                        emailBlindIndex,
                        nationalIdBlindIndex,
                        telephoneBlindIndex,
                        studentIdBlindIndex,
                        2027,
                    ]);
                    applicationId = level1ApplicationResult.rows[0].id;
                }

                userName = name;
                await client.query(`
                    UPDATE level1_training_registrations
                     SET email = $1,
                           email_blind_index = $2,
                           application_id = $3,
                           status = 'account_created',
                           account_created_at = now()
                     WHERE id = $4
                `, [encrypt(normalizedEmail), emailBlindIndex, applicationId, level1Registration.id]);
            } else if (existingApp.rows.length > 0) {
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

            // A completed registration should no longer be treated as a
            // pending OTP account on a later request. Keep this separate from
            // the database transaction because Auth is an external service.
            const { error: metadataError } = await adminClient.auth.admin.updateUserById(authUser.id, {
                user_metadata: {
                    ...(authUser.user_metadata || {}),
                    icpchue_registration: false,
                },
            });
            if (metadataError) {
                // The database transaction is already committed. Do not turn
                // a successful registration into a retryable 500 because an
                // external Auth metadata update was temporarily unavailable.
                console.error('[Register] Failed to finalize Auth metadata:', metadataError.message);
            }

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
