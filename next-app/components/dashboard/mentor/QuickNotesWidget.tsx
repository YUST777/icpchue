'use client';

import React from 'react';
import { FileText, Calendar, Lightbulb } from 'lucide-react';

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
    const formatDate = (isoStr?: string) => {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col h-full space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center">
                        <FileText size={13} />
                    </div>
                    <h2 className="text-xs font-semibold text-white/90 tracking-tight">Student Thinking Notes</h2>
                </div>
                <span className="text-[11px] text-white/40 font-mono">{notes.length} Recorded</span>
            </div>

            {/* Notes List with hidden scrollbars */}
            <div className="overflow-y-auto max-h-[350px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 space-y-2.5">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-white/30 space-y-2 font-mono">
                        <Lightbulb size={20} className="text-white/20" />
                        <span className="text-xs">No thinking notes recorded for this student.</span>
                    </div>
                ) : (
                    notes.map((n) => (
                        <div 
                            key={n.id}
                            className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5 hover:bg-white/[0.03] transition-colors"
                        >
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-[#E8C15A] font-semibold text-[11px] bg-[#E8C15A]/10 px-2 py-0.5 rounded-md border border-[#E8C15A]/20">
                                    {n.contest_id ? `Problem ${n.contest_id} ${n.problem_index || ''}` : `Note #${n.id}`}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                                    <Calendar size={10} />
                                    <span>{formatDate(n.updated_at)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-white/85 whitespace-pre-wrap leading-relaxed pt-1 break-words break-all">
                                {n.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
