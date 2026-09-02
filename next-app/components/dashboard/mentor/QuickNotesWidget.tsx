'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';

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
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <FileText size={16} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                        Trainee Notes ({notes.length})
                    </h2>
                </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin">
                {notes.length === 0 ? (
                    <div className="text-center py-6 text-xs text-white/40">
                        No private notes written by student yet.
                    </div>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-1 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between text-[10px] text-white/40">
                                <span className="font-semibold text-[#E8C15A]">
                                    {n.contest_id ? `Problem ${n.contest_id} ${n.problem_index || ''}` : 'General Note'}
                                </span>
                                <span>{formatDate(n.updated_at)}</span>
                            </div>
                            <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                                {n.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
