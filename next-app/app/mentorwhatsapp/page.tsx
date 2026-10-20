'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MessageCircle, Users, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Result =
    | { status: 'assigned'; group: { name: string; mentorName: string | null; inviteLink: string } }
    | { status: 'not_enrolled' }
    | { status: 'full' };

/** Each Level 0 trainee's own mentor WhatsApp group (no one sees other groups or lists). */
export default function MentorWhatsAppPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.replace('/login?redirect=/mentorwhatsapp');
            return;
        }
        fetch('/api/mentor-group', { credentials: 'include' })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Could not load your mentor group.');
                setResult(data as Result);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your mentor group.'));
    }, [authLoading, isAuthenticated, router]);

    return (
        <div className="min-h-[100dvh] bg-[#0B0B0C] text-white flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <Image src="/icpchue-logo.webp" alt="ICPC HUE" width={56} height={56} priority />
                </div>

                <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
                    {!result && !error && (
                        <div className="py-10 flex flex-col items-center gap-3 text-white/60">
                            <Loader2 className="w-6 h-6 animate-spin text-[#E8C15A]" />
                            <p className="text-sm">Finding your mentor group…</p>
                        </div>
                    )}

                    {error && (
                        <div className="py-6">
                            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                            <p className="font-semibold">{error}</p>
                            <button type="button" onClick={() => location.reload()} className="mt-5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10">
                                Try again
                            </button>
                        </div>
                    )}

                    {result?.status === 'assigned' && (
                        <>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#E8C15A] font-bold mb-2">Level 0 · Season 2027</p>
                            <h1 className="text-2xl sm:text-3xl font-black mb-1">Your mentor group</h1>
                            <p className="text-white/60 text-sm mb-6" dir="rtl" lang="ar">ده جروب المنتور بتاعك، هيتابعك طول الموسم</p>

                            <div className="rounded-2xl border border-[#E8C15A]/25 bg-[#E8C15A]/[0.06] p-5 mb-6">
                                <div className="flex items-center justify-center gap-2 text-[#E8C15A] mb-1">
                                    <Users className="w-5 h-5" />
                                    <span className="text-xl font-bold">{result.group.name}</span>
                                </div>
                                {result.group.mentorName && (
                                    <p className="text-sm text-white/70">Mentor: <span className="font-semibold text-white">{result.group.mentorName}</span></p>
                                )}
                            </div>

                            <a
                                href={result.group.inviteLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] text-[#0B0B0C] font-bold text-base hover:brightness-110 transition"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Join on WhatsApp
                            </a>
                            <p className="text-xs text-white/40 mt-4" dir="rtl" lang="ar">لو انت في الجروب بالفعل، مش محتاج تعمل حاجة ✅</p>
                        </>
                    )}

                    {result?.status === 'not_enrolled' && (
                        <div className="py-4">
                            <AlertCircle className="w-10 h-10 text-[#E8C15A] mx-auto mb-3" />
                            <h1 className="text-xl font-bold mb-2">You&apos;re not in Level 0 · 2027</h1>
                            <p className="text-sm text-white/60">Mentor groups are for students registered in the Level 0 training this season. If you think this is a mistake, contact the ICPC HUE team.</p>
                        </div>
                    )}

                    {result?.status === 'full' && (
                        <div className="py-4">
                            <AlertCircle className="w-10 h-10 text-[#E8C15A] mx-auto mb-3" />
                            <h1 className="text-xl font-bold mb-2">All mentor groups are full</h1>
                            <p className="text-sm text-white/60">We&apos;ll open more places soon. Contact the ICPC HUE team and we&apos;ll add you.</p>
                        </div>
                    )}
                </div>

                <Link href="/dashboard" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/70">
                    <ArrowLeft className="w-4 h-4" /> Back to dashboard
                </Link>
            </div>
        </div>
    );
}
