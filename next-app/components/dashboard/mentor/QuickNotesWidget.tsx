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
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-amber-500/10 text-amber-400">
                        <FileText size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-wider uppercase">
                        All Student Notes ({notes.length})
                    </h2>
                </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin">
                {notes.length === 0 ? (
                    <div className="text-center py-8 text-xs text-white/30">
                        No notes recorded by student yet.
                    </div>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between text-[10px] text-white/40 border-b border-white/5 pb-1">
                                <span className="font-semibold text-[#E8C15A] font-mono">
                                    {n.contest_id ? `Problem ${n.contest_id} ${n.problem_index || ''}` : 'General Note'}
                                </span>
                                <span>{formatDate(n.updated_at)}</span>
                            </div>
                            <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed pt-1">
                                {n.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
