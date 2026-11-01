import { UserProfile } from "@/lib/types";
import { getDisplayName } from "@/lib/utils";

interface IdentityCardProps {
    user?: { id?: number; email?: string; student_id?: string; role?: string; created_at?: string; createdAt?: string };
    profile: UserProfile;
    streak?: number;
    maxStreak?: number;
    // Profile pictures are disabled site-wide; these props are kept optional for
    // backward compatibility with the caller but are no longer used.
    profilePicture?: string | null;
    uploadingPfp?: boolean;
    pfpError?: string;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
    handlePfpUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDeletePfp?: () => void;
}

const ROLE_BADGE: Record<string, string> = {
    owner: 'Founder',
    instructor: 'Instructor',
    mentor: 'Mentor',
    admin: 'Admin',
    trainee: 'Trainee',
    student: 'Trainee',
};

export function IdentityCard({
    user,
    profile,
    streak,
    maxStreak,
}: IdentityCardProps) {
    const rawRole = (user?.role || profile?.role || 'trainee').toLowerCase();
    const roleLabel = ROLE_BADGE[rawRole] || (rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1) : 'Trainee');

    const cf = profile.codeforces_profile?.trim().replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//, '').replace(/\/$/, '');
    const cfData = profile.codeforces_data;
    const best = cfData?.maxRating && cfData.maxRating > (cfData.rating || 0) ? `Best ${cfData.maxRating}` : null;
    const rating = cfData?.rating ? `${cfData.rating}${cfData.rank ? ` · ${cfData.rank}` : ''}` : 'Unrated';
    const joined = (user?.created_at || user?.createdAt || profile.created_at)
        ? new Date((user?.created_at || user?.createdAt || profile.created_at) as string).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null;
    const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

    const details: { label: string; value: string; sub?: string | null }[] = [
        { label: 'Codeforces', value: cf || 'Not linked' },
        { label: 'Rating', value: rating, sub: best },
        { label: 'Streak', value: days(streak ?? 0), sub: maxStreak ? `Best ${days(maxStreak)}` : null },
        { label: 'Joined', value: joined || '—' },
    ];

    return (
        <div className="flex w-full flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-white/5 bg-[#121212] p-5">
            <div className="min-w-0">
                <p className="font-mono text-xs text-[#E8C15A]">{roleLabel}</p>
                <h2 className="mt-1 line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-[#F2F2F2]">{getDisplayName(profile.name) || 'Member'}</h2>
                <p className="mt-1 font-mono text-xs text-[#666]">@{profile.student_id || user?.email?.split('@')[0]}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/[0.06] pt-4">
                {details.map(d => (
                    <div key={d.label} className="min-w-0">
                        <dt className="text-xs text-white/50">{d.label}</dt>
                        <dd className="mt-0.5 truncate font-mono text-sm text-white">{d.value}</dd>
                        {d.sub && <p className="mt-0.5 font-mono text-xs text-white/40">{d.sub}</p>}
                    </div>
                ))}
            </dl>
        </div>
    );
}
