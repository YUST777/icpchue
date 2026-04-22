import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function sanitize(s: string): string {
    // Keep Arabic chars \u0600-\u06FF, english letters, numbers, spaces, and hyphens/underscores
    const safe = s.replace(/[^\w\s\u0600-\u06FF-]/g, '').replace(/\s+/g, '_').substring(0, 60);
    return safe || 'team';
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = await rateLimit(`team_reg:${ip}`, 5, 600);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    try {
        const formData = await req.formData();
        const getText = (key: string) => (formData.get(key) as string || '').trim();

        const teamName = getText('team_name');
        
        const members = [1, 2, 3].map(i => ({
            name: getText(`member${i}_name`),
            studentId: getText(`member${i}_student_id`),
            nationalId: getText(`member${i}_national_id`),
            codeforces: getText(`member${i}_codeforces`),
            icpcEmail: getText(`member${i}_icpc_email`),
            faculty: getText(`member${i}_faculty`),
            isLeader: getText('leader') === String(i),
        }));

        const leaderPhone = getText('leader_phone');
        const errors: string[] = [];
        
        if (!teamName) {
            errors.push('Team name is required');
        } else {
            if (teamName.length > 30) errors.push('Team name must not exceed 30 characters');
            if (!/^[A-Za-z0-9]/.test(teamName)) errors.push('Team name must start with an English letter or number');
            if (!/^[A-Za-z0-9\s_\-]+$/.test(teamName)) errors.push('Team name must only contain English letters, numbers, spaces, underscores, or hyphens');
            if (/\s{2,}/.test(teamName)) errors.push('Team name must not contain consecutive spaces');
        }
        
        if (!members.some(m => m.isLeader)) errors.push('Please select a team leader');

        for (let i = 0; i < 3; i++) {
            const m = members[i]; const n = i + 1;
            if (!m.name) {
                errors.push(`Member ${n}: Name is required`);
            } else if (!/^[A-Za-z0-9\s\-_]+$/.test(m.name)) {
                errors.push(`Member ${n}: Name must be in English`);
            }
            if (!m.studentId || m.studentId.length < 7) errors.push(`Member ${n}: Valid Student ID required`);
            if (!m.nationalId || !/^\d{14}$/.test(m.nationalId)) errors.push(`Member ${n}: National ID must be exactly 14 digits`);
            if (!m.faculty) errors.push(`Member ${n}: Faculty is required`);
        }
        if (!leaderPhone || !/^\+20\d{10}$/.test(leaderPhone)) errors.push('Valid leader phone required (+20...)');

        // Validate files
        for (let i = 1; i <= 3; i++) {
            const front = formData.get(`member${i}_id_front`) as File | null;
            const back = formData.get(`member${i}_id_back`) as File | null;
            if (!front || front.size === 0) errors.push(`Member ${i}: National ID front photo is required`);
            if (!back || back.size === 0) errors.push(`Member ${i}: National ID back photo is required`);
            if (front && front.size > 5 * 1024 * 1024) errors.push(`Member ${i}: Front photo exceeds 5MB`);
            if (back && back.size > 5 * 1024 * 1024) errors.push(`Member ${i}: Back photo exceeds 5MB`);
            const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
            if (front && front.size > 0 && !allowed.includes(front.type)) errors.push(`Member ${i}: Front photo must be an image (JPG/PNG/WebP)`);
            if (back && back.size > 0 && !allowed.includes(back.type)) errors.push(`Member ${i}: Back photo must be an image (JPG/PNG/WebP)`);
        }

        if (errors.length > 0) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

        const teamFolder = `${sanitize(teamName)}_${Date.now()}`;
        const teamDir = path.join(process.cwd(), 'team-uploads', teamFolder);

        const filePaths: Record<string, string> = {};

        // Save files — use member's actual name for folders and files
        for (let i = 0; i < 3; i++) {
            const n = i + 1;
            const safeName = members[i].name.replace(/\s+/g, '_').replace(/[^\w]/g, '') || `member${n}`;
            const memberFolder = safeName;
            const memberDir = path.join(teamDir, memberFolder);
            await mkdir(memberDir, { recursive: true, mode: 0o777 });

            for (const side of ['front', 'back'] as const) {
                const file = formData.get(`member${n}_id_${side}`) as File;
                if (file && file.size > 0) {
                    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                    const filename = `${safeName}_${side}card.${ext}`;
                    const filePath = path.join(memberDir, filename);
                    const buffer = Buffer.from(await file.arrayBuffer());
                    await writeFile(filePath, buffer);
                    filePaths[`m${n}_${side}`] = `team-uploads/${teamFolder}/${memberFolder}/${filename}`;
                }
            }
        }

        const userAgent = (req.headers.get('user-agent') || 'unknown').substring(0, 255);

        const result = await query(`
            INSERT INTO team_registrations (
                team_name,
                member1_name, member1_student_id, member1_national_id, member1_codeforces, member1_faculty, member1_is_leader, member1_id_front_path, member1_id_back_path, member1_icpc_email,
                member2_name, member2_student_id, member2_national_id, member2_codeforces, member2_faculty, member2_is_leader, member2_id_front_path, member2_id_back_path, member2_icpc_email,
                member3_name, member3_student_id, member3_national_id, member3_codeforces, member3_faculty, member3_is_leader, member3_id_front_path, member3_id_back_path, member3_icpc_email,
                leader_phone, ip_address, user_agent
            ) VALUES (
                $1,
                $2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,
                $29,$30,$31
            ) RETURNING id
        `, [
            teamName,
            members[0].name, members[0].studentId, members[0].nationalId, members[0].codeforces || null, members[0].faculty, members[0].isLeader, filePaths.m1_front || null, filePaths.m1_back || null, members[0].icpcEmail || null,
            members[1].name, members[1].studentId, members[1].nationalId, members[1].codeforces || null, members[1].faculty, members[1].isLeader, filePaths.m2_front || null, filePaths.m2_back || null, members[1].icpcEmail || null,
            members[2].name, members[2].studentId, members[2].nationalId, members[2].codeforces || null, members[2].faculty, members[2].isLeader, filePaths.m3_front || null, filePaths.m3_back || null, members[2].icpcEmail || null,
            leaderPhone, ip, userAgent,
        ]);

        return NextResponse.json({ success: true, message: 'Team registered!', id: result.rows[0].id }, { status: 201 });
    } catch (error) {
        console.error('[Team Registration Error]', error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
