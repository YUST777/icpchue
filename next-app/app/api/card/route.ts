import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createBlindIndex } from '@/lib/security/encryption';
import { getClientIp } from '@/lib/security/request';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

// File magic bytes signatures to prevent mime-type spoofing
const MAGIC_BYTES: Record<string, number[][]> = {
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/jpg': [[0xFF, 0xD8, 0xFF]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return false;
    return signatures.some(sig =>
        sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
    );
}

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);

        // Rate limit: 5 uploads per 10 minutes per IP
        const rl = await rateLimit(`card_upload:${ip}`, 5, 600);
        if (!rl.success) {
            return NextResponse.json({
                error: 'عدد المحاولات كبير جداً. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.'
            }, { status: 429 });
        }

        const formData = await req.formData();
        const rawStudentId = (formData.get('student_id') as string || '').trim();
        const cardFile = formData.get('card') as File | null;

        // 1. Validate Horus Student ID
        const studentId = rawStudentId.replace(/\D/g, '');
        if (!studentId || studentId.length < 5 || studentId.length > 12) {
            return NextResponse.json({
                error: 'يرجى إدخال كود الطالب / الرقم الجامعي بشكل صحيح (أرقام فقط).'
            }, { status: 400 });
        }

        // 2. Validate Card Image
        if (!cardFile || cardFile.size === 0) {
            return NextResponse.json({
                error: 'يرجى رفع صورة البطاقة الشخصية.'
            }, { status: 400 });
        }

        if (cardFile.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.'
            }, { status: 400 });
        }

        const mimeType = cardFile.type.toLowerCase();
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return NextResponse.json({
                error: 'نوع الصورة غير مدعوم. يرجى رفع صورة بصيغة JPG أو PNG أو WebP.'
            }, { status: 400 });
        }

        const fileBuffer = Buffer.from(await cardFile.arrayBuffer());
        if (!validateMagicBytes(fileBuffer, mimeType)) {
            return NextResponse.json({
                error: 'الملف المرفوع غير صالح أو تالف. يرجى التأكد من رفع صورة صحيحة.'
            }, { status: 400 });
        }

        // 3. Upload to Supabase Storage (id-verifications bucket)
        const fileUid = randomUUID();
        const ext = cardFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const storagePath = `cards/${studentId}_${fileUid}.${cleanExt}`;

        const adminClient = createAdminClient();
        const { error: uploadError } = await adminClient.storage
            .from('id-verifications')
            .upload(storagePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) {
            console.error('[Card Upload Error] Supabase storage upload failed:', uploadError);
            return NextResponse.json({
                error: 'حدث خطأ أثناء رفع الصورة إلى السيرفر. يرجى المحاولة لاحقاً.'
            }, { status: 500 });
        }

        // 4. Save metadata to Database
        const studentIdBlindIndex = createBlindIndex(studentId);
        const userAgent = req.headers.get('user-agent') || 'unknown';

        await query(`
            INSERT INTO student_card_uploads (
                student_id,
                student_id_blind_index,
                file_path,
                file_name,
                mime_type,
                file_size_bytes,
                ip_address,
                user_agent,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
            studentId,
            studentIdBlindIndex,
            storagePath,
            cardFile.name.slice(0, 255),
            mimeType,
            cardFile.size,
            ip,
            userAgent.slice(0, 500)
        ]);

        return NextResponse.json({
            success: true,
            message: 'تم رفع صورة البطاقة الشخصية وتوثيقها بنجاح!',
            student_id: studentId
        });

    } catch (err: unknown) {
        console.error('[Card Upload Unexpected Error]:', err);
        return NextResponse.json({
            error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
        }, { status: 500 });
    }
}
