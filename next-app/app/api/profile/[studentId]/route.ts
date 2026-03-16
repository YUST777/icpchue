import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createBlindIndex, decrypt } from '@/lib/encryption';
import { getCachedData } from '@/lib/cache';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ studentId: string }> } // Params are async in Next.js 15+ (and 13+ app dir sometimes)
) {
    // Await params if using newer Next.js types, or just access if not.
    // Safe to await.
    const { studentId } = await params;

    if (!studentId) {
        return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    try {
        const fullEmail = studentId + '@horus.edu.eg';

        // Use cache for profile data (60s TTL)
        const profileData = await getCachedData(`profile:${studentId}`, 60, async () => {
            const emailBlindIndex = createBlindIndex(fullEmail);

            const userResult = await query(
                'SELECT id, role, profile_visibility, created_at, application_id, profile_picture FROM users WHERE email_blind_index = $1',
                [emailBlindIndex]
            );

            if (userResult.rows.length === 0) return null;

            const user = userResult.rows[0];
            if (user.profile_visibility === 'private') return { isPrivate: true };

            const appResult = await query(
                'SELECT name, faculty, student_level, codeforces_profile, leetcode_profile, codeforces_data, application_type, submitted_at FROM applications WHERE id = $1',
                [user.application_id]
            );

            const application = appResult.rows[0] || {};

            return {
                isPrivate: false,
                name: application.name,
                role: user.role,
                faculty: application.faculty,
                studentLevel: application.student_level,
                codeforcesProfile: application.codeforces_profile,
                leetcodeProfile: decrypt(application.leetcode_profile),
                submittedAt: application.submitted_at,
                achievementsCount: 0,
                achievements: [] as string[]
            };
        });

        if (!profileData) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profileData.isPrivate) {
            return NextResponse.json({ error: 'This profile is private' }, { status: 403 });
        }

        // Fetch achievements
        const achievementResult = await query(
            'SELECT achievement_id FROM user_achievements WHERE user_id = (SELECT id FROM users WHERE email_blind_index = $1 LIMIT 1)',
            [createBlindIndex(fullEmail)]
        );
        
        profileData.achievements = achievementResult.rows.map(r => r.achievement_id);
        profileData.achievementsCount = achievementResult.rows.length;

        return NextResponse.json({
            success: true,
            profile: profileData
        });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
