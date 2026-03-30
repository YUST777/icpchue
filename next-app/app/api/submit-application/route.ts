import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { scraperQueue } from '@/lib/db/queue';
import { encrypt, createBlindIndex } from '@/lib/security/encryption';
import { sanitizeInput } from '@/lib/security/validation';

import { rateLimit } from '@/lib/cache/rate-limit';

export async function POST(req: NextRequest) {
    // 1. Rate Limiting (Global Redis)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const limitResult = await rateLimit(`submit_app:${ip}`, 3, 600); // 3 attempts per 10 mins

    if (!limitResult.success) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();

        // Data sanitization and validation
        const applicationType = sanitizeInput(body.applicationType || 'trainee');
        const name = sanitizeInput(body.name);
        const faculty = sanitizeInput(body.faculty);
        const id = sanitizeInput(body.id);
        const nationalId = sanitizeInput(body.nationalId);
        const studentLevel = sanitizeInput(body.studentLevel);
        const telephone = sanitizeInput(body.telephone);
        const hasLaptop = body.hasLaptop === true || body.hasLaptop === 'true';
        const codeforcesProfile = sanitizeInput(body.codeforcesProfile);
        const leetcodeProfile = sanitizeInput(body.leetcodeProfile);
        const email = sanitizeInput(body.email).toLowerCase();

        // Basic validation
        if (!name || !faculty || !id || !studentLevel || !telephone || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get client info
        let ip = req.headers.get('x-forwarded-for') || 'unknown';
        if (ip.includes(',')) ip = ip.split(',')[0].trim();
        ip = sanitizeInput(ip).substring(0, 45);

        const userAgent = sanitizeInput(req.headers.get('user-agent') || 'unknown').substring(0, 255);

        // Create blind indexes
        const emailBlindIndex = createBlindIndex(email);
        const nationalIdBlindIndex = nationalId ? createBlindIndex(nationalId) : null;
        const telephoneBlindIndex = createBlindIndex(telephone);
        const studentIdBlindIndex = createBlindIndex(id);

        const sql = `
        INSERT INTO applications (
          application_type, name, faculty, student_id, national_id, student_level, 
          telephone, address, has_laptop, codeforces_profile, leetcode_profile, email, 
          ip_address, user_agent, scraping_status,
          email_blind_index, national_id_blind_index, telephone_blind_index, student_id_blind_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id
        `;

        const result = await query(sql, [
            applicationType,
            name,
            faculty,
            id,
            nationalId ? encrypt(nationalId) : null,
            studentLevel,
            encrypt(telephone),
            null, // address
            hasLaptop ? 1 : 0,
            codeforcesProfile || null,
            leetcodeProfile || null,
            encrypt(email || null),
            ip,
            userAgent,
            'pending', // Initial status
            emailBlindIndex,
            nationalIdBlindIndex,
            telephoneBlindIndex,
            studentIdBlindIndex
        ]);

        const applicationId = result.rows[0].id;

        // Trigger Scraper via BullMQ
        if (applicationType === 'trainer') {
            const jobData = {
                applicationId,
                leetcodeProfile,
                codeforcesProfile,
                applicationType
            };

            // Scalable Job Queue (Persistent, Retries)
            try {
                await scraperQueue.add('scrape-job', jobData);
            } catch {
                // Non-blocking failure
            }
        } else {
            // Mark as not applicable
            query("UPDATE applications SET scraping_status = 'not_applicable' WHERE id = $1", [applicationId])
                .catch(() => { });
        }

        return NextResponse.json({
            success: true,
            message: 'تم استلام طلبك بنجاح',
            id: applicationId
        }, { status: 201 });

    } catch (error: unknown) {
        const err = error as { code?: string; detail?: string };
        if (err.code === '23505') {
            const detail = err.detail || '';
            let field = 'البيانات';
            if (detail.includes('email')) field = 'البريد الإلكتروني';
            else if (detail.includes('national_id')) field = 'الرقم القومي';
            else if (detail.includes('student_id')) field = 'رقم الجلوس';
            else if (detail.includes('telephone')) field = 'رقم الهاتف';

            return NextResponse.json({
                error: `عذراً، ${field} مسجل مسبقاً. لا يمكن تكرار التسجيل.`,
                duplicateField: field,
                code: 'DUPLICATE_ENTRY'
            }, { status: 409 });
        }

        return NextResponse.json({
            error: 'حدث خطأ في الخادم. الرجاء المحاولة مرة أخرى لاحقاً.'
        }, { status: 500 });
    }
}
