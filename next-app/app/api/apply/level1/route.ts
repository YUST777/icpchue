import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { encrypt, createBlindIndex } from '@/lib/security/encryption';
import { sanitizeInput } from '@/lib/security/validation';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';

/**
 * Records the training application before an account is created.
 *
 * Level 1 registration and an ICPC HUE website account are deliberately
 * separate records. This lets a student register for training first, then
 * decide whether to create an account for the practice platform.
 */
export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    const limitResult = await rateLimit(`apply_level1:${ip}`, 5, 3600);

    if (!limitResult.success) {
        return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const name = sanitizeInput(body.name);
        const telephone = sanitizeInput(body.telephone);
        const faculty = sanitizeInput(body.faculty);
        const studentId = sanitizeInput(body.id);
        const nationalId = sanitizeInput(body.nationalId);
        const studentLevel = sanitizeInput(body.studentLevel);
        const codeforcesProfile = sanitizeInput(body.codeforcesProfile);
        const leetcodeProfile = sanitizeInput(body.leetcodeProfile);

        if (!name || !faculty || !studentId || !studentLevel) {
            return NextResponse.json({ error: 'Name, faculty, student ID, and academic level are required.' }, { status: 400 });
        }
        if (!/^\+20\d{10}$/.test(telephone)) {
            return NextResponse.json({ error: 'Enter a valid Egyptian phone number.' }, { status: 400 });
        }
        if (!/^\d{7,12}$/.test(studentId)) {
            return NextResponse.json({ error: 'Enter a valid student ID.' }, { status: 400 });
        }
        if (!/^\d{14}$/.test(nationalId) || !/^[23]/.test(nationalId)) {
            return NextResponse.json({ error: 'Enter a valid 14-digit national ID.' }, { status: 400 });
        }

        const telephoneBlindIndex = createBlindIndex(telephone);
        const studentIdBlindIndex = createBlindIndex(studentId);
        const nationalIdBlindIndex = createBlindIndex(nationalId);
        const duplicate = await query(
            `SELECT r.id, r.status, r.application_id,
                    EXISTS (SELECT 1 FROM users u WHERE u.application_id = r.application_id) AS has_account
             FROM level1_training_registrations r
             WHERE r.season_year = 2027
               AND (r.telephone_blind_index = $1
                 OR r.student_id_blind_index = $2
                 OR r.national_id_blind_index = $3)
             LIMIT 1`,
            [telephoneBlindIndex, studentIdBlindIndex, nationalIdBlindIndex]
        );

        if (duplicate.rows.length > 0) {
            if (duplicate.rows[0].application_id && duplicate.rows[0].has_account) {
                return NextResponse.json({
                    error: 'This student record already has an ICPC HUE account. Please sign in.'
                }, { status: 409 });
            }

            // The request is safe to repeat if the student left before creating
            // an account. Do not expose the internal application ID.
            return NextResponse.json({ success: true, alreadyRegistered: true }, { status: 200 });
        }

        const userAgent = sanitizeInput(req.headers.get('user-agent') || 'unknown').substring(0, 255);
        await query(
            `INSERT INTO level1_training_registrations (
                season_year, training_level, status, name, faculty, student_id, national_id,
                academic_level, telephone, has_laptop, codeforces_profile, leetcode_profile,
                email, email_blind_index, national_id_blind_index, telephone_blind_index,
                student_id_blind_index, ip_address, user_agent
             )
             VALUES (2027, 'level1', 'registered', $1, $2, $3, $4, $5, $6, false, $7, $8,
                     NULL, NULL, $9, $10, $11, $12, $13)`,
            [
                name,
                faculty,
                encrypt(studentId),
                encrypt(nationalId),
                studentLevel,
                encrypt(telephone),
                codeforcesProfile || null,
                leetcodeProfile || null,
                nationalIdBlindIndex,
                telephoneBlindIndex,
                studentIdBlindIndex,
                ip.substring(0, 45),
                userAgent,
            ]
        );

        return NextResponse.json({ success: true, alreadyRegistered: false }, { status: 201 });
    } catch (error: unknown) {
        const err = error as { code?: string };
        if (err.code === '23505') {
            return NextResponse.json({ error: 'This student is already registered for Level 1.' }, { status: 409 });
        }

        console.error('[Level 1 application API Error]', error);
        return NextResponse.json({ error: 'We could not save your registration. Please try again.' }, { status: 500 });
    }
}
