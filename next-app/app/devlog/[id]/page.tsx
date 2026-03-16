'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, FileText, Download, X, ZoomIn, ChevronRight } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { getDevLog } from '@/lib/devlog';
import dynamic from 'next/dynamic';
import { MapExpandedProvider } from '@/context/MapExpandedContext';
import DOMPurify from 'isomorphic-dompurify';

const SecurityArchitecture = dynamic(() => import('@/components/SecurityArchitecture'), { ssr: false });

// Enhanced Markdown Renderer with better styling
// Enhanced Markdown Renderer with robust parsing and custom styling
const MarkdownRenderer = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Normalize newlines (handle both actual and escaped newlines)
    const normalizedContent = content.replace(/\\n/g, '\n');

    // Split content into paragraphs/blocks (blocks are separated by 2+ newlines)
    const blocks = normalizedContent.split(/\n\s*\n/);

    const intro = blocks.slice(0, 2).join('\n\n');
    const detailed = blocks.slice(2).join('\n\n');

    const renderBlocks = (text: string, keyPrefix: string) => {
        const textBlocks = text.split(/\n\s*\n/).filter(b => b.trim() !== '');

        return textBlocks.map((block, idx) => {
            const trimmed = block.trim();

            // Handle horizontal rules
            if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
                return (
                    <hr key={`${keyPrefix}-${idx}`} className="my-8 border-zinc-200 dark:border-zinc-800" />
                );
            }

            // Handle headers (# Full Header)
            const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const headerText = headerMatch[2];

                // Style based on level
                if (level === 1) {
                    return <h1 key={`${keyPrefix}-${idx}`} className="text-3xl font-black text-zinc-900 dark:text-white mb-6 mt-10 tracking-tight">{headerText}</h1>;
                }
                if (level === 2) {
                    return <h2 key={`${keyPrefix}-${idx}`} className="text-2xl font-black text-zinc-900 dark:text-white mb-5 mt-8 tracking-tight">{headerText}</h2>;
                }
                if (level === 3 || level === 4) {
                    return (
                        <div key={`${keyPrefix}-${idx}`} className="mb-6 mt-8">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#E8C15A] mb-3 flex items-center gap-2">
                                <span className="w-1 h-6 bg-[#E8C15A] rounded-full"></span>
                                {headerText}
                            </h3>
                        </div>
                    );
                }
            }

            // Handle legacy header style (**text:**)
            const legacyHeaderMatch = trimmed.match(/^\*\*(.*?):\*\*$/);
            if (legacyHeaderMatch) {
                return (
                    <div key={`${keyPrefix}-${idx}`} className="mb-6 mt-8">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-[#E8C15A] mb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-[#E8C15A] rounded-full"></span>
                            {legacyHeaderMatch[1]}
                        </h3>
                    </div>
                );
            }

            // Handle tables (| col | col |)
            if (trimmed.startsWith('|')) {
                const rows = trimmed.split('\n').filter(row => row.trim().startsWith('|'));
                if (rows.length > 1) {
                    return (
                        <div key={`${keyPrefix}-${idx}`} className="overflow-x-auto mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
                            <table className="w-full text-sm text-left border-collapse">
                                <tbody>
                                    {rows.map((row, rowIdx) => {
                                        const cells = row.split('|').filter(c => c.trim() !== '' || row.indexOf('|') !== row.lastIndexOf('|')).slice(1, -1);
                                        const isHeader = rowIdx === 0;
                                        const isDivider = row.includes('---');

                                        if (isDivider) return null;

                                        return (
                                            <tr key={rowIdx} className={isHeader ? "bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800" : "border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"}>
                                                {cells.map((cell, cellIdx) => (
                                                    <td
                                                            key={cellIdx}
                                                        className={`px-4 py-3 ${isHeader ? "font-bold text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}
                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }}
                                                    />
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                }
            }

            // Handle list items (* item)
            if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                const lines = trimmed.split('\n');
                const items: string[] = [];
                let currentItem = "";

                lines.forEach(line => {
                    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                        if (currentItem) items.push(currentItem);
                        currentItem = line.trim().replace(/^[*|-]\s*/, '');
                    } else if (currentItem) {
                        currentItem += " " + line.trim();
                    }
                });
                if (currentItem) items.push(currentItem);

                return (
                    <ul key={`${keyPrefix}-${idx}`} className="space-y-4 mb-8">
                        {items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-3 group">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] mt-2.5 shrink-0 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(232,193,90,0.4)]"></span>
                                <span
                                    className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(item
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-900 dark:text-white font-semibold">$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code class="bg-[#E8C15A]/10 dark:bg-[#E8C15A]/20 text-[#E8C15A] dark:text-[#E8C15A] px-1.5 py-0.5 rounded text-xs font-mono border border-[#E8C15A]/20">$1</code>'))
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                );
            }

            // Handle normal paragraphs
            return (
                <p
                    key={`${keyPrefix}-${idx}`}
                    className="mb-6 leading-relaxed text-zinc-700 dark:text-zinc-300"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(trimmed
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-900 dark:text-white font-semibold">$1</strong>')
                            .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.2 py-0.4 rounded text-xs font-mono">$1</code>'))
                    }}
                />
            );
        });
    };

    return (
        <div className="markdown-content">
            {renderBlocks(intro, 'intro')}

            {detailed && (
                <>
                    <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[10000px] opacity-100 mt-0' : 'max-h-0 opacity-0'}`}>
                        {renderBlocks(detailed, 'detailed')}
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-4 mb-2 inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 hover:from-zinc-200 hover:to-zinc-100 dark:hover:from-zinc-800 dark:hover:to-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronRight size={16} className="rotate-90 transition-transform" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronRight size={16} className="-rotate-90 transition-transform" />
                                Read Full Technical Narrative
                            </>
                        )}
                    </button>
                </>
            )}
        </div>
    );
};

export default function DevLogDetailPage() {
    const params = useParams();
    const id = params?.id;
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Convert id to number safely
    const logId = Array.isArray(id) ? parseInt(id[0]) : parseInt(id || '0');
    const entry = getDevLog(logId);

    if (!entry) {
        notFound();
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return new Intl.DateTimeFormat('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[#E8C15A]/30 selection:text-zinc-900 dark:selection:text-zinc-100">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-100 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/devlog" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium hidden sm:inline">Back to Log</span>
                        </Link>
                    </div>
                </div>
            </header>

            <MapExpandedProvider>
                <main className="max-w-3xl mx-auto px-6 py-20">
                    {/* Meta Header */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 px-3 flex items-center justify-center bg-gradient-to-br from-[#f58416] to-[#f8dc6d] rounded-full shadow-sm">
                                <span className="text-white font-black text-[10px] uppercase tracking-tight">
                                    {entry.version_short}
                                </span>
                            </div>
                            <div className="text-zinc-400 dark:text-zinc-600 font-medium text-sm flex items-center gap-2">
                                <Calendar size={14} />
                                {formatDate(entry.date)}
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 leading-tight">
                            {entry.title}
                        </h1>
                        <div className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                            {entry.subtitle}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="prose prose-lg prose-zinc dark:prose-invert max-w-none">
                        <div className="lead border-l-4 border-[#E8C15A] pl-6 text-zinc-600 dark:text-zinc-400">
                            <MarkdownRenderer content={entry.content || entry.description} />
                        </div>

                        {/* Security Architecture Diagram for Entry #6 */}
                        {entry.id === 6 && (
                            <div className="my-16 not-prose">
                                <SecurityArchitecture />
                                <p className="text-center text-xs text-zinc-500 mt-4 font-mono">
                                    Figure 1.0: Defense-in-Depth Security Layers
                                </p>
                            </div>
                        )}

                        {/* Media Gallery */}
                        {entry.media && entry.media.length > 0 && (
                            <div className="my-12">
                                <div className="columns-1 md:columns-2 gap-6 space-y-6 not-prose">
                                    {entry.media.map((item, idx) => (
                                        <div key={idx} className="break-inside-avoid">
                                            {item.type === 'image' && (
                                                <figure className="group relative bg-zinc-50 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                                                    <div
                                                        className="w-full cursor-zoom-in"
                                                        onClick={() => setSelectedImage(item.src)}
                                                    >
                                                        <Image
                                                            src={item.src}
                                                            alt={item.alt}
                                                            width={1200}
                                                            height={800}
                                                            className="w-full h-auto"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                            <div className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                                                                <ZoomIn size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {item.caption && (
                                                        <figcaption className="p-3 text-[11px] text-center border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                                            <a
                                                                href={item.caption.replace('Verify: ', '')}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-zinc-600 dark:text-zinc-400 hover:text-[#E8C15A] dark:hover:text-[#E8C15A] font-medium transition-colors inline-flex items-center gap-1"
                                                            >
                                                                {item.caption}
                                                            </a>
                                                        </figcaption>
                                                    )}
                                                </figure>
                                            )}

                                            {item.type === 'pdf' && (
                                                <a
                                                    href={item.src}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download // Added for extra security/usability
                                                    className="group flex items-center gap-4 p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-[#E8C15A] dark:hover:border-[#E8C15A] transition-colors"
                                                >
                                                    <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-xl flex items-center justify-center shrink-0">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-[#E8C15A] transition-colors">
                                                            {item.alt}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            PDF Document • Secure Download
                                                        </div>
                                                    </div>
                                                    <div className="h-10 w-10 bg-white dark:bg-black rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-[#E8C15A] group-hover:border-[#E8C15A] transition-all">
                                                        <Download size={18} />
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {entry.highlights && entry.highlights.length > 0 && (
                            <div className="not-prose mt-12">
                                <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
                                    Technical Highlights
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {entry.highlights.map((highlight, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                            <div className="w-2 h-2 rounded-full bg-[#E8C15A] mt-2 shrink-0 shadow-[0_0_8px_rgba(232,193,90,0.5)]" />
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                {highlight}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </MapExpandedProvider>

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/99 backdrop-blur-3xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setSelectedImage(null)}
                >
                    {/* Close button with high z-index and fixed position relative to viewport */}
                    <button
                        className="fixed top-6 right-6 z-[110] bg-zinc-900/50 hover:bg-zinc-800 text-white rounded-full p-3 backdrop-blur-md transition-all border border-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                        }}
                    >
                        <X size={24} />
                    </button>

                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={e => e.stopPropagation()} // Prevent close when clicking image area wrapper
                    >
                        <Image
                            src={selectedImage}
                            alt="Full screen preview"
                            fill
                            className="object-contain"
                            quality={100}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
