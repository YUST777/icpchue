'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Bold, Italic, List, ListOrdered, Quote, Code, 
    Link as LinkIcon, Image as ImageIcon, Eye, 
    Type, Edit3, Loader2, Save, Check
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

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

    // Fetch initial notes
    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/user/notes?contestId=${contestId}&problemIndex=${problemIndex}`);
                if (res.ok) {
                    const data = await res.json();
                    setContent(data.content || '');
                }
            } catch (error) {
                console.error('Failed to load notes:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, [contestId, problemIndex]);

    // Auto-save logic (debounced)
    useEffect(() => {
        if (isLoading) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const res = await fetch('/api/user/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contestId, problemIndex, content })
                });
                if (res.ok) {
                    setLastSaved(new Date());
                }
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                setTimeout(() => setIsSaving(false), 500);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [content, contestId, problemIndex, isLoading]);

    const handleToolbarAction = (type: string) => {
        const textarea = document.getElementById('notes-textarea') as HTMLTextAreaElement;
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
            case 'link': replacement = `[${selectedText || 'link'}](url)`; break;
            case 'image': replacement = `![${selectedText || 'alt'}](url)`; break;
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
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
                <Loader2 size={32} className="animate-spin" />
                <span className="text-sm font-medium uppercase tracking-widest opacity-50">Syncing Notes...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 bg-[#1a1a1a] shrink-0">
                <div className="flex items-center gap-0.5">
                    <ToolbarButton icon={<Type size={16} />} onClick={() => handleToolbarAction('h1')} label="Heading" />
                    <ToolbarButton icon={<Bold size={16} />} onClick={() => handleToolbarAction('bold')} label="Bold" />
                    <ToolbarButton icon={<Italic size={16} />} onClick={() => handleToolbarAction('italic')} label="Italic" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<List size={16} />} onClick={() => handleToolbarAction('list')} label="Bullet List" />
                    <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => handleToolbarAction('ordered')} label="Numbered List" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<Quote size={16} />} onClick={() => handleToolbarAction('quote')} label="Quote" />
                    <ToolbarButton icon={<Code size={16} />} onClick={() => handleToolbarAction('code')} label="Inline Code" />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<LinkIcon size={16} />} onClick={() => handleToolbarAction('link')} label="Link" />
                    <ToolbarButton icon={<ImageIcon size={16} />} onClick={() => handleToolbarAction('image')} label="Image" />
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
                        onClick={() => setIsPreview(!isPreview)}
                        className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${
                            isPreview 
                                ? 'bg-[#E8C15A] text-black shadow-[0_0_15px_rgba(232,193,90,0.3)]' 
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {isPreview ? <Edit3 size={16} /> : <Eye size={16} />}
                        <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
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
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type your notes here... Supports Markdown."
                        className="absolute inset-0 w-full h-full bg-transparent p-6 sm:p-8 text-sm text-white/90 outline-none resize-none font-mono leading-relaxed placeholder:text-white/10"
                        spellCheck={false}
                        dir="auto"
                    />
                )}
            </div>
            
            {/* Footer Tip */}
            {!isPreview && (
                <div className="px-4 py-2 bg-[#171718] border-t border-white/5 text-[10px] text-white/30 flex justify-between items-center">
                    <span className="opacity-40 uppercase tracking-widest font-bold flex items-center gap-2">
                        Markdown Support
                        <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/20">Alt + N</span>
                    </span>
                    {lastSaved && (
                        <span className="opacity-60">Last synced at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            )}
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
