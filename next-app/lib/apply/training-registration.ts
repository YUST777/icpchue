import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { encrypt, createBlindIndex } from '@/lib/security/encryption';
import { sanitizeInput } from '@/lib/security/validation';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { toAsciiDigits } from '@/lib/auth/horus-email';

export type TrainingLevel = 'level0' | 'level1';

const intakeConfig = {
    level0: {
        table: 'level0_training_registrations',
        label: 'Level 0',
        rateLimitKey: 'apply_level0',
    },
    level1: {
        table: 'level1_training_registrations',
        label: 'Level 1',
        rateLimitKey: 'apply_level1',
    },
} as const satisfies Record<TrainingLevel, { table: string; label: string; rateLimitKey: string }>;

/** ASCII digits only; accepts Arabic-Indic digits and strips spaces/dashes. */
export function normalizeDigits(value: unknown): string {
    return toAsciiDigits(String(value ?? '')).replace(/\D/g, '');
}

/** Canonical +20XXXXXXXXXX form, matching what the /apply form produces. */
export function normalizeEgyptPhone(value: unknown): string {
    const raw = toAsciiDigits(String(value ?? '')).replace(/[^\d+]/g, '');
    if (!raw || raw.startsWith('+20')) return raw;
    if (raw.startsWith('0020')) return `+${raw.slice(2)}`;
    if (raw.startsWith('20')) return `+${raw}`;
    if (raw.startsWith('0')) return `+20${raw.slice(1)}`;
    return raw.startsWith('+') ? raw : `+20${raw}`;
}

/** Records a training application before an ICPC HUE account is created. */
export async function handleTrainingApplication(req: NextRequest, trainingLevel: TrainingLevel) {
    const config = intakeConfig[trainingLevel];
    const ip = getClientIp(req);
    // Many students submit from the same campus or carrier IP. Duplicate
    // submissions are idempotent (matched by blind indexes), so this bucket
    // only needs to stop scripted floods, not normal classroom traffic.
    const limitResult = await rateLimit(`${config.rateLimitKey}-v2:${ip}`, 120, 3600);

    if (!limitResult.success) {
        const retryAfter = Math.max(1, Math.ceil((limitResult.reset - Date.now()) / 1000));
        return NextResponse.json(
            { error: 'Too many registrations from this network. Please wait a few minutes and try again.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
    }

    try {
        const body = await req.json();
        // Phones with Arabic keyboards send Arabic-Indic digits and stray
        // spaces/dashes; canonicalize before validation and blind indexing.
        const name = sanitizeInput(body.name);
        const telephone = sanitizeInput(normalizeEgyptPhone(body.telephone));
        const faculty = sanitizeInput(body.faculty);
        const studentId = sanitizeInput(normalizeDigits(body.id));
        const nationalId = sanitizeInput(normalizeDigits(body.nationalId));
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
             FROM ${config.table} r
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

            return NextResponse.json({ success: true, alreadyRegistered: true }, { status: 200 });
        }

        const userAgent = sanitizeInput(req.headers.get('user-agent') || 'unknown').substring(0, 255);
        await query(
            `INSERT INTO ${config.table} (
                season_year, training_level, status, name, faculty, student_id, national_id,
                academic_level, telephone, has_laptop, codeforces_profile, leetcode_profile,
                email, email_blind_index, national_id_blind_index, telephone_blind_index,
                student_id_blind_index, ip_address, user_agent
             )
             VALUES (2027, $1, 'registered', $2, $3, $4, $5, $6, $7, false, $8, $9,
                     NULL, NULL, $10, $11, $12, $13, $14)`,
            [
                trainingLevel,
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
            return NextResponse.json({ error: `This student is already registered for ${config.label}.` }, { status: 409 });
        }

        console.error(`[${config.label} application API Error]`, error);
        return NextResponse.json({ error: 'We could not save your registration. Please try again.' }, { status: 500 });
    }
}
