'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDue, isOverdue, useAssignments } from '@/hooks/useAssignments';

export default function AssignmentsPage() {
    const { items, loading } = useAssignments();
    const sheets = [...new Set(items.map((i) => i.sheet))];

    return (
        <div className="w-full space-y-6 animate-fade-in">
            <PageHeader title="Assignments" subtitle="Everything assigned so far and when it is due." />

            {loading && <Skeleton className="h-64 w-full rounded-2xl" />}
            {!loading && items.length === 0 && <p className="text-sm text-white/60">No assignments yet.</p>}

            {sheets.map((s) => {
                const rows = items.filter((i) => i.sheet === s);
                const left = rows.filter((i) => !i.solved).length;
                const { sheetLabel, sheetName, due } = rows[0];
                return (
                    <section key={s} className="ui-card p-4 md:p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <h3 className="text-lg font-semibold text-white">
                                {sheetLabel} <span className="font-normal text-white/50">{sheetName}</span>
                            </h3>
                            <span className={`text-sm ${left > 0 && isOverdue(due) ? 'text-red-300' : 'text-white/60'}`}>
                                {left === 0 ? 'Done' : `${left} of ${rows.length} left · due ${formatDue(due)}`}
                            </span>
                        </div>
                        <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
                            {rows.map((i) => (
                                <li key={i.letter} className="border-b border-white/5">
                                    <Link href={i.href} className={`flex items-center gap-3 py-2.5 transition-colors hover:text-white ${i.solved ? 'text-white/40' : ''}`}>
                                        <span className="w-5 shrink-0 font-mono text-sm font-semibold text-[#E8C15A]">{i.letter}</span>
                                        <span className={`min-w-0 flex-1 truncate text-sm ${i.solved ? '' : 'text-white/85'}`}>{i.title}</span>
                                        {i.solved && <span className="shrink-0 text-xs">Solved</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
