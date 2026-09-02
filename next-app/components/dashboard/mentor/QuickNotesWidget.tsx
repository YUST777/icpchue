'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface NoteItem {
    id: number;
    contest_id?: string;
    problem_index?: string;
    content: string;
    updated_at: string;
}

interface QuickNotesWidgetProps {
    notes: NoteItem[];
}

export function QuickNotesWidget({ notes }: QuickNotesWidgetProps) {
    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-amber-500/10 text-amber-400">
                        <FileText size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-tight uppercase">
                        Trainee Notes ({notes.length})
                    </h2>
                </div>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[160px] scrollbar-thin">
                {notes.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-white/40">
                        No private notes written.
                    </div>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] text-white/40">
                                <span className="font-semibold text-[#E8C15A]">
                                    {n.contest_id ? `P ${n.contest_id} ${n.problem_index || ''}` : 'Note'}
                                </span>
                                <span>{formatDate(n.updated_at)}</span>
                            </div>
                            <p className="text-[11px] text-white/80 whitespace-pre-wrap leading-tight">
                                {n.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
