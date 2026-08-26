import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
    try {
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

        // --- Validation ---
        if (!name?.trim()) {
            return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
        }
        if (!email?.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 });
        }
        if (!studentId?.trim() || studentId.length < 7) {
            return NextResponse.json({ error: 'رقم القيد غير صالح' }, { status: 400 });
        }
        if (!phone?.trim() || !/^\+20\d{10}$/.test(phone)) {
            return NextResponse.json({ error: 'رقم الهاتف غير صالح' }, { status: 400 });
        }
        if (!faculty?.trim()) {
            return NextResponse.json({ error: 'الكلية مطلوبة' }, { status: 400 });
        }
        if (!academicLevel?.trim()) {
            return NextResponse.json({ error: 'المستوى الدراسي مطلوب' }, { status: 400 });
        }
        if (!committees || !Array.isArray(committees) || committees.length === 0) {
            return NextResponse.json({ error: 'يرجى اختيار لجنة واحدة على الأقل' }, { status: 400 });
        }

        // Committee-specific validation
        if (committees.includes('mentor') || committees.includes('instructor')) {
            if (!codeforcesHandle?.trim()) {
                return NextResponse.json({ error: 'Codeforces Handle مطلوب للمينتور والإنستراكتور' }, { status: 400 });
            }
        }

        // --- Check for duplicates ---
        const dupCheck = await query(
            `SELECT id, email, student_id FROM job_applications WHERE email = $1 OR student_id = $2 LIMIT 1`,
            [email.toLowerCase().trim(), studentId.trim()]
        );

        if (dupCheck.rows.length > 0) {
            return NextResponse.json(
                { error: 'يوجد طلب مسجل مسبقاً بهذا البريد أو رقم القيد.' },
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
                name.trim(),
                email.toLowerCase().trim(),
                studentId.trim(),
                phone.trim(),
                faculty.trim(),
                academicLevel.trim(),
                nationalId?.trim() || null,
                committees,
                mediaSkills || [],
                hasCamera ? hasCamera === 'yes' : null,
                portfolioLink?.trim() || null,
                codeforcesHandle?.trim() || null,
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
        if (message.includes('idx_job_applications_email') || message.includes('idx_job_applications_student_id')) {
            return NextResponse.json(
                { error: 'يوجد طلب مسجل مسبقاً بهذا البريد أو رقم القيد.' },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, { status: 500 });
    }
}
