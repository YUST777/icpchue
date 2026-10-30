'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Code, Eye, Type, Edit3, Check } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProblemNotesProps {
    contestId: string;
    problemIndex: string;
}

export default function ProblemNotes({ contestId, problemIndex }: ProblemNotesProps) {
    const [content, setContent] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const savingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch initial notes
    useEffect(() => {
        const controller = new AbortController();
        const fetchNotes = async () => {
            setIsLoading(true);
            setIsPreview(false);
            setLastSaved(null);
            try {
                const res = await fetch(`/api/user/notes?contestId=${contestId}&problemIndex=${problemIndex}`, { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    setContent(data.content || '');
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Failed to load notes:', error);
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        fetchNotes();
        return () => controller.abort();
    }, [contestId, problemIndex]);

    // Auto-save logic (debounced) — uses abort flag to prevent cross-problem saves
    useEffect(() => {
        if (isLoading) return;
        let cancelled = false;

        const timer = setTimeout(async () => {
            if (cancelled) return;
            setIsSaving(true);
            try {
                const res = await fetch('/api/user/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contestId, problemIndex, content })
                });
                if (!cancelled && res.ok) {
                    setLastSaved(new Date());
                }
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                if (!cancelled) {
                    savingResetTimerRef.current = setTimeout(() => setIsSaving(false), 500);
                }
            }
        }, 1500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (savingResetTimerRef.current) clearTimeout(savingResetTimerRef.current);
        };
    }, [content, contestId, problemIndex, isLoading]);

    const handleToolbarAction = (type: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        let replacement = '';

        switch (type) {
            case 'h1': replacement = `\n# ${selectedText}`; break;
            case 'bold': replacement = `**${selectedText}**`; break;
            case 'italic': replacement = `*${selectedText}*`; break;
            case 'list': replacement = `\n- ${selectedText}`; break;
            case 'ordered': replacement = `\n1. ${selectedText}`; break;
            case 'quote': replacement = `\n> ${selectedText}`; break;
            case 'code': replacement = `\`${selectedText}\``; break;
        }

        const newContent = content.substring(0, start) + replacement + content.substring(end);
        setContent(newContent);
        
        // Refocus and set cursor
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-[#121212] overflow-hidden" role="status" aria-label="Loading notes">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#1a1a1a] shrink-0">
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-6 w-6 rounded" />
                        ))}
                    </div>
                    <Skeleton className="h-6 w-14 rounded" />
                </div>
                <div className="p-4 space-y-3 flex-1">
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <div className="pt-2 space-y-2">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 bg-[#1a1a1a] shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-0.5 shrink-0">
                    <ToolbarButton icon={<Type size={16} />} onClick={() => handleToolbarAction('h1')} label="Heading" />
                    <ToolbarButton icon={<Bold size={16} />} onClick={() => handleToolbarAction('bold')} label="Bold" />
                    <ToolbarButton icon={<Italic size={16} />} onClick={() => handleToolbarAction('italic')} label="Italic" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<List size={16} />} onClick={() => handleToolbarAction('list')} label="Bullet List" />
                    <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => handleToolbarAction('ordered')} label="Numbered List" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<Quote size={16} />} onClick={() => handleToolbarAction('quote')} label="Quote" />
                    <ToolbarButton icon={<Code size={16} />} onClick={() => handleToolbarAction('code')} label="Inline Code" />
                </div>

                <div className="flex items-center gap-3 pr-2">
                    {/* Status Info */}
                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <span className="text-[10px] text-white/40 font-medium">Saving...</span>
                        ) : lastSaved ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-green-500/60 font-medium animate-in fade-in">
                                <Check size={10} />
                                <span>Saved</span>
                            </div>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsPreview(!isPreview)}
                        aria-pressed={isPreview}
                        title={isPreview ? 'Edit markdown' : 'Preview markdown'}
                        className={`!min-h-0 !min-w-0 h-8 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 border text-[10px] font-bold uppercase tracking-[0.12em] ${
                            isPreview 
                                ? 'border-[#E8C15A]/70 bg-[#E8C15A] text-black shadow-[0_4px_14px_rgba(232,193,90,0.18)]'
                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:bg-white/[0.07] hover:text-white'
                        }`}
                    >
                        {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
                        <span>
                            {isPreview ? 'Edit' : 'Preview'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Editor / Preview Area */}
            <div className="flex-1 min-h-0 relative">
                {isPreview ? (
                    <div className="absolute inset-0 overflow-y-auto p-6 sm:p-8 prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap font-sans text-white/80 leading-relaxed" dir="auto">
                            {content || <span className="opacity-30 italic">No notes yet...</span>}
                        </div>
                    </div>
                ) : (
                    <textarea
                        id="notes-textarea"
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type your notes here... Supports Markdown."
                        className="absolute inset-0 w-full h-full bg-transparent p-6 sm:p-8 text-sm text-white/90 outline-none resize-none font-mono leading-relaxed placeholder:text-white/10"
                        spellCheck={false}
                        dir="auto"
                    />
                )}
            </div>
            
        </div>
    );
}

function ToolbarButton({ icon, onClick, label }: { icon: React.ReactNode, onClick: () => void, label: string }) {
    return (
        <Tooltip content={label} position="bottom">
            <button
                onClick={onClick}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded transition-colors"
                // No title here as we're using custom tooltips
            >
                {icon}
            </button>
        </Tooltip>
    );
}
