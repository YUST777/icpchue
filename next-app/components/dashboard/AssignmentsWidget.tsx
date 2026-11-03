'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDue, isOverdue, useAssignments } from '@/hooks/useAssignments';

const SHOWN = 5;

/** Home widget: the assigned problems you still have to solve, oldest first. */
export function AssignmentsWidget() {
    const { items, loading } = useAssignments();

    if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;
    if (items.length === 0) return null;

    const left = items.filter((i) => !i.solved);
    const sheets = [...new Set(items.map((i) => i.sheet))].map((s) => {
        const rows = left.filter((i) => i.sheet === s);
        return { label: items.find((i) => i.sheet === s)!.sheetLabel, count: rows.length };
    });
    const nextDue = left.map((i) => i.due).sort()[0];

    return (
        <section className="ui-card p-4 md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-lg font-semibold text-white">Your assignments</h3>
                {left.length > 0 && nextDue && (
                    <span className={`text-sm ${isOverdue(nextDue) ? 'text-red-300' : 'text-white/60'}`}>
                        {isOverdue(nextDue) ? 'Overdue since' : 'Due'} {formatDue(nextDue)}
                    </span>
                )}
            </div>

            {left.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">All caught up. Every assigned problem is solved.</p>
            ) : (
                <>
                    <p className="mt-1 text-sm text-white/60">
                        {left.length} left{sheets.filter((s) => s.count > 0).map((s) => ` · ${s.label} ${s.count}`).join('')}
                    </p>
                    <ul className="mt-3 divide-y divide-white/5">
                        {left.slice(0, SHOWN).map((i) => (
                            <li key={`${i.sheet}-${i.letter}`}>
                                <Link href={i.href} className="flex items-center gap-3 py-2.5 transition-colors hover:text-white">
                                    <span className="w-14 shrink-0 text-xs text-white/50">{i.sheetLabel}</span>
                                    <span className="w-5 shrink-0 font-mono text-sm font-semibold text-[#E8C15A]">{i.letter}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-white/85">{i.title}</span>
                                    <span className={`shrink-0 text-xs ${isOverdue(i.due) ? 'text-red-300' : 'text-white/40'}`}>{formatDue(i.due)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <Link href="/dashboard/assignments" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#E8C15A] hover:underline">
                        {left.length > SHOWN ? `See all ${left.length}` : 'Open assignments'}
                        <ArrowRight size={14} />
                    </Link>
                </>
            )}
        </section>
    );
}
