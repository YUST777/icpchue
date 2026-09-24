import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';

const MAX_JSON_BYTES = 128 * 1024;
const ALLOWED_COMMITTEES = new Set(['media', 'mentor', 'organizing', 'instructor']);

function boundedText(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
            return NextResponse.json({ error: 'Application payload is too large.' }, { status: 413 });
        }

        const ip = getClientIp(req);
        const rl = await rateLimit(`job-apply:${ip}`, 3, 600);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

        const body = await req.json();

        const {
            name,
            email,
            studentId,
            phone,
            faculty,
            academicLevel,
            nationalId,
            committees,
            // Media
            mediaSkills,
            hasCamera,
            portfolioLink,
            // Mentor / Instructor shared
            codeforcesHandle,
            // Mentor
            contestExperience,
            weeklyAvailability,
            // Organizing
            hasEcpcTshirt,
            tshirtSize,
            campusDays,
            organizingExperience,
            // Instructor
            preferredTeachingLevel,
            teachingExperience,
        } = body;

        // --- Sanitization & Normalization ---
        const cleanName = boundedText(name, 120);
        const cleanEmail = boundedText(email, 254).toLowerCase();
        const cleanStudentId = boundedText(studentId, 10);
        const cleanPhone = boundedText(phone, 32);
        const cleanNationalId = boundedText(nationalId, 14) || null;
        let cleanCfHandle = boundedText(codeforcesHandle, 64) || null;
        if (cleanCfHandle) {
            cleanCfHandle = cleanCfHandle.replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//i, '').replace(/\/$/, '').trim();
        }
        let cleanPortfolio = boundedText(portfolioLink, 2048) || null;
        if (cleanPortfolio && !/^https?:\/\//i.test(cleanPortfolio)) {
            cleanPortfolio = `https://${cleanPortfolio}`;
        }
        if (cleanPortfolio) {
            try {
                const portfolioUrl = new URL(cleanPortfolio);
                if (!['http:', 'https:'].includes(portfolioUrl.protocol)) cleanPortfolio = null;
            } catch {
                cleanPortfolio = null;
            }
        }

        // --- Validation ---
        if (!cleanName || cleanName.length < 3) {
            return NextResponse.json({ error: 'الاسم ثلاثي مطلوب' }, { status: 400 });
        }
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return NextResponse.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 });
        }
        if (!cleanStudentId || !/^\d{7,10}$/.test(cleanStudentId)) {
            return NextResponse.json({ error: 'رقم القيد غير صالح (7 إلى 10 أرقام)' }, { status: 400 });
        }
        if (!cleanPhone || !/^\+201\d{9}$/.test(cleanPhone)) {
            return NextResponse.json({ error: 'رقم هاتف الواتساب غير صالح (+201xxxxxxxxx)' }, { status: 400 });
        }
        if (!cleanNationalId || !/^[23]\d{13}$/.test(cleanNationalId)) {
            return NextResponse.json({ error: 'الرقم القومي غير صالح (14 رقم يبدأ بـ 2 أو 3)' }, { status: 400 });
        }
        if (!faculty?.trim()) {
            return NextResponse.json({ error: 'الكلية مطلوبة' }, { status: 400 });
        }
        if (!academicLevel?.trim()) {
            return NextResponse.json({ error: 'المستوى الدراسي مطلوب' }, { status: 400 });
        }
        if (!committees || !Array.isArray(committees) || committees.length === 0 || committees.length > ALLOWED_COMMITTEES.size ||
            committees.some((committee: unknown) => typeof committee !== 'string' || !ALLOWED_COMMITTEES.has(committee))) {
            return NextResponse.json({ error: 'يرجى اختيار لجنة واحدة على الأقل' }, { status: 400 });
        }

        // Committee-specific validation
        if (committees.includes('mentor') || committees.includes('instructor')) {
            if (!cleanCfHandle) {
                return NextResponse.json({ error: 'Codeforces Handle مطلوب للمينتور والإنستراكتور' }, { status: 400 });
            }
        }
        if (committees.includes('media')) {
            if (!mediaSkills || !Array.isArray(mediaSkills) || mediaSkills.length === 0) {
                return NextResponse.json({ error: 'يرجى تحديد مهارة واحدة على الأقل في الميديا' }, { status: 400 });
            }
        }
        if (committees.includes('instructor')) {
            if (!preferredTeachingLevel?.trim()) {
                return NextResponse.json({ error: 'يرجى تحديد مستوى التدريس المفضل' }, { status: 400 });
            }
        }

        // --- Check for duplicates ---
        const dupCheck = await query(
            `SELECT id, email, student_id, national_id 
             FROM job_applications 
             WHERE email = $1 OR student_id = $2 OR (national_id = $3 AND national_id IS NOT NULL) 
             LIMIT 1`,
            [cleanEmail, cleanStudentId, cleanNationalId]
        );

        if (dupCheck.rows.length > 0) {
            return NextResponse.json(
                { error: 'يوجد طلب مسجل مسبقاً بهذا البريد، رقم القيد، أو الرقم القومي.' },
                { status: 409 }
            );
        }

        // --- Insert ---
        const result = await query(
            `INSERT INTO job_applications (
                name, email, student_id, phone, faculty, academic_level, national_id,
                committees,
                media_skills, has_camera, portfolio_link,
                codeforces_handle, contest_experience, weekly_availability,
                has_ecpc_tshirt, tshirt_size, campus_days, organizing_experience,
                preferred_teaching_level, teaching_experience
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8,
                $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17, $18,
                $19, $20
            ) RETURNING id, created_at`,
            [
                cleanName,
                cleanEmail,
                cleanStudentId,
                cleanPhone,
                faculty.trim(),
                academicLevel.trim(),
                cleanNationalId,
                committees,
                mediaSkills || [],
                hasCamera ? hasCamera === 'yes' : null,
                cleanPortfolio,
                cleanCfHandle,
                contestExperience?.trim() || null,
                weeklyAvailability?.trim() || null,
                hasEcpcTshirt ? hasEcpcTshirt === 'yes' : null,
                tshirtSize?.trim() || null,
                campusDays?.trim() || null,
                organizingExperience?.trim() || null,
                preferredTeachingLevel?.trim() || null,
                teachingExperience?.trim() || null,
            ]
        );

        const { id, created_at } = result.rows[0];

        return NextResponse.json({
            success: true,
            id: String(id),
            created_at,
            message: 'تم استلام طلبك بنجاح! سيتم مراجعة الطلب والتواصل معك قريباً.',
        });
    } catch (err: unknown) {
        console.error('[Job Apply Error]', err);
        const message = err instanceof Error ? err.message : 'Internal server error';

        // Handle unique constraint violations
        if (
            message.includes('idx_job_applications_email') ||
            message.includes('idx_job_applications_student_id') ||
            message.includes('unique') ||
            message.includes('duplicate key')
        ) {
            return NextResponse.json(
                { error: 'يوجد طلب مسجل مسبقاً بهذا البريد، رقم القيد، أو الرقم القومي.' },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, { status: 500 });
    }
}
