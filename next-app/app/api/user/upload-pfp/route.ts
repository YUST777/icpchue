import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const PFPS_DIR = path.join(process.cwd(), 'public', 'pfps');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const MAGIC_BYTES: Record<string, number[][]> = {
    'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/jpg':  [[0xFF, 0xD8, 0xFF]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return false;
    return signatures.some(sig =>
        sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
    );
}

// Ensure pfps directory exists
if (!fs.existsSync(PFPS_DIR)) {
    fs.mkdirSync(PFPS_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authUser = await verifyAuth(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Rate limit: 3 per 5 mins (unusually frequent uploads)
        const ratelimit = await rateLimit(`pfp_upload:${userId}`, 3, 300);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait before uploading again.' }, { status: 429 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('image') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        // Validate file type (client-reported MIME)
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Only PNG, JPG, and WebP images are allowed' }, { status: 400 });
        }

        // Convert to buffer early so we can validate magic bytes
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate actual file content via magic bytes (not just MIME)
        if (!validateMagicBytes(buffer, file.type)) {
            return NextResponse.json({ error: 'File content does not match declared image type' }, { status: 400 });
        }

        // Get current profile picture to delete later
        const currentPfpResult = await query(
            'SELECT profile_picture FROM users WHERE id = $1',
            [userId]
        );
        const oldPfp = currentPfpResult.rows[0]?.profile_picture;

        const uuid = randomUUID();
        const finalFilename = `${uuid}.webp`;
        const webpPath = path.join(PFPS_DIR, finalFilename);

        try {
            await sharp(buffer)
                .webp({ quality: 85 })
                .resize(512, 512, { fit: 'cover', position: 'center' })
                .toFile(webpPath);

            // Set file permissions so nginx can read it
            fs.chmodSync(webpPath, 0o644);

        } catch (sharpError) {
            void sharpError;
            return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
        }

        // Update database with new profile picture filename
        try {
            await query(
                'UPDATE users SET profile_picture = $1 WHERE id = $2',
                [finalFilename, userId]
            );
        } catch (dbError) {
            void dbError;
            try {
                fs.unlinkSync(webpPath);
            } catch { /* ignore cleanup errors */ }
            return NextResponse.json({ error: 'Failed to save profile picture' }, { status: 500 });
        }

        // Delete old profile picture if exists
        if (oldPfp && oldPfp !== finalFilename) {
            const oldPath = path.join(PFPS_DIR, oldPfp);
            try {
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            } catch {
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profile_picture: finalFilename,
            url: `/pfps/${finalFilename}`
        });

    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
