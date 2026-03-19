
import React, { useState, useEffect } from 'react';
import { X, Copy, RotateCcw, Check, ExternalLink, Clock, MemoryStick, Tag } from 'lucide-react';
import { Submission } from './types';

interface SubmissionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    submissionId: number | null;
    contestId: string;
    onRestoreCode: (code: string) => void;
}

export default function SubmissionDetailModal({ 
    isOpen, 
    onClose, 
    submissionId, 
    contestId,
    onRestoreCode 
}: SubmissionDetailModalProps) {
    const [loading, setLoading] = useState(false);
    const [submission, setSubmission] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && submissionId) {
            fetchSubmission();
        } else {
            setSubmission(null);
        }
    }, [isOpen, submissionId]);

    const fetchSubmission = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/submissions/cf/${submissionId}`);
            const data = await res.json();
            if (data.success) {
                setSubmission(data);
            }
        } catch (err) {
            console.error('Failed to fetch submission details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!submission?.sourceCode) return;
        navigator.clipboard.writeText(submission.sourceCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a1b] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1e1e1f]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5">
                            <RotateCcw size={18} className="text-[#E8C15A]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Submission Detail</h3>
                            <p className="text-[10px] text-[#888] font-mono">ID: #{submission?.cfSubmissionId || submissionId}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#888] hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-8 h-8 border-2 border-[#E8C15A]/20 border-t-[#E8C15A] rounded-full animate-spin" />
                            <p className="text-xs text-[#888] animate-pulse">Loading Source Code...</p>
                        </div>
                    ) : submission ? (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1 text-[#888]">
                                        <Tag size={12} />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Verdict</span>
                                    </div>
                                    <p className={`text-sm font-bold ${
                                        submission.verdict === 'Accepted' || submission.verdict === 'OK' 
                                        ? 'text-[#2cbb5d]' : 'text-[#ef4743]'
                                    }`}>
                                        {submission.verdict}
                                    </p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1 text-[#888]">
                                        <Clock size={12} />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Time</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{submission.timeMs} ms</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1 text-[#888]">
                                        <MemoryStick size={12} />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Memory</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{submission.memoryKb} KB</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1 text-[#888]">
                                        <div className="w-3 h-3 rounded-full border border-white/40" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Language</span>
                                    </div>
                                    <p className="text-sm font-bold text-white truncate">{submission.language}</p>
                                </div>
                            </div>

                            {/* Source Code */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#888] uppercase tracking-wider">Source Code</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleCopy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs transition-all active:scale-95"
                                        >
                                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <a 
                                            href={`https://codeforces.com/contest/${contestId}/submission/${submission.cfSubmissionId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 border border-[#E8C15A]/20 rounded-lg text-xs text-[#E8C15A] transition-all"
                                        >
                                            <ExternalLink size={14} />
                                            CF Original
                                        </a>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <pre className="p-4 bg-[#111] rounded-xl border border-white/5 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] custom-scrollbar text-gray-300">
                                        <code>{submission.sourceCode}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-[#888] text-sm italic">
                            Could not load submission details.
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-[#1e1e1f] flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={() => {
                            if (submission?.sourceCode) {
                                onRestoreCode(submission.sourceCode);
                                onClose();
                            }
                        }}
                        disabled={!submission?.sourceCode}
                        className="flex-[2] py-2.5 bg-gradient-to-r from-[#E8C15A] to-[#D4A017] hover:from-[#D4A017] hover:to-[#D4A017] text-black font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#E8C15A]/10"
                    >
                        Restore to Editor
                    </button>
                </div>
            </div>
        </div>
    );
}
