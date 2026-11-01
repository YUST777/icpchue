import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export interface RankRow { rank: number; username: string; solved: number; me: boolean }
export interface RankInfo {
    rank: number;
    total: number;
    level: number;
    solved: number;
    accepted: number;
    submissions: number;
    /** Solved problems needed to pass the person one place above, or null at #1. */
    toNext: number | null;
    neighbours: RankRow[];
}

interface LeaderboardWidgetProps {
    info: RankInfo | null;
    loading?: boolean;
}

export function LeaderboardWidget({ info, loading = false }: LeaderboardWidgetProps) {
    const topPercent = info ? Math.max(1, Math.ceil((info.rank / info.total) * 100)) : 0;
    const acceptance = info && info.submissions > 0 ? Math.round((info.accepted / info.submissions) * 100) : null;

    return (
        <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex flex-col">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="font-semibold text-[#F2F2F2] text-base">Rank</h4>
                    <p className="text-xs text-[#A0A0A0]">{info ? `Level ${info.level} sheets leaderboard` : 'Sheets leaderboard'}</p>
                </div>
                <Link href="/dashboard/leaderboard" className="-my-3 py-3 pl-3 shrink-0 text-[#E8C15A] hover:text-[#dcb651] text-xs font-semibold transition-colors flex items-center gap-1">
                    View full <ChevronRight size={12} />
                </Link>
            </div>

            {loading ? (
                <div className="mt-4 space-y-3">
                    <Skeleton className="h-14 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                </div>
            ) : !info ? (
                <p className="mt-6 text-sm text-[#666]">Not ranked yet. Solve a problem to enter the board.</p>
            ) : (
                <>
                    <div className="mt-3 flex items-end gap-3">
                        <span className="font-mono text-5xl font-medium leading-none tabular-nums text-[#E8C15A]">#{info.rank}</span>
                        <span className="pb-1 text-sm text-[#A0A0A0]">of {info.total} · top {topPercent}%</span>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 border-y border-white/[0.06] py-3">
                        <div>
                            <dt className="text-xs text-white/50">Solved</dt>
                            <dd className="mt-0.5 font-mono text-lg tabular-nums text-white">{info.solved}</dd>
                        </div>
                        <div className="border-l border-white/[0.06] pl-4">
                            <dt className="text-xs text-white/50">Accepted</dt>
                            <dd className="mt-0.5 font-mono text-lg tabular-nums text-white">{acceptance === null ? '—' : `${acceptance}%`}</dd>
                        </div>
                        <div className="border-l border-white/[0.06] pl-4">
                            <dt className="text-xs text-white/50">{info.toNext === null ? 'Position' : `To #${info.rank - 1}`}</dt>
                            <dd className="mt-0.5 font-mono text-lg tabular-nums text-white">{info.toNext === null ? 'First' : `+${info.toNext}`}</dd>
                        </div>
                    </dl>

                    <ol className="mt-3 space-y-1 [@media(max-height:900px)]:hidden">
                        {info.neighbours.map(r => (
                            <li key={r.rank} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${r.me ? 'bg-white/[0.06] text-white' : 'text-white/60'}`}>
                                <span className="w-8 font-mono text-xs tabular-nums text-white/40">#{r.rank}</span>
                                <span className="min-w-0 flex-1 truncate">{r.me ? 'You' : r.username}</span>
                                <span className="font-mono text-xs tabular-nums">{r.solved} solved</span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </div>
    );
}
