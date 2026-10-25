import { ImageResponse } from 'next/og';
import { getPublicProfile } from '@/lib/profile/public-profile';
import { getDisplayName } from '@/lib/utils';

export const alt = 'ICPC HUE profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await params;
    const result = await getPublicProfile(studentId);
    const profile = result.status === 'ok' ? result.profile : null;
    const name = profile ? getDisplayName(profile.name) || 'ICPC HUE member' : 'ICPC HUE';

    const stats = profile ? [
        { label: 'Problems solved', value: String(profile.stats.solved) },
        { label: 'Sheets completed', value: `${profile.stats.sheetsDone}/${profile.stats.sheetsStarted}` },
        { label: 'Best streak', value: `${profile.stats.maxStreak}d` },
        { label: 'Codeforces', value: profile.codeforces?.rating ? String(profile.codeforces.rating) : '—' },
    ] : [];

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B0B0C', color: '#fff', padding: 72 }}>
                <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#E8C15A' }}>ICPC HUE</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: 80, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
                    {profile && (
                        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
                            {`@${studentId}${profile.faculty ? ` · ${profile.faculty}` : ''}`}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                    {stats.map(s => (
                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)', background: '#121214' }}>
                            <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: '#E8C15A' }}>{s.value}</div>
                            <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    );
}
