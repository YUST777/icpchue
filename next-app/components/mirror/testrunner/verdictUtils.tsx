import {
    CheckCircle2,
    XCircle,
    Clock,
    Database,
    Loader2
} from 'lucide-react';
import { CFSubmissionStatus } from '../types';

export function getVerdictIcon(verdict: string) {
    if (verdict === 'Accepted' || verdict === 'OK') return <CheckCircle2 size={18} className="text-green-400" />;
    if (verdict.includes('Wrong')) return <XCircle size={18} className="text-red-400" />;
    if (verdict.includes('Time')) return <Clock size={18} className="text-yellow-400" />;
    if (verdict.includes('Memory')) return <Database size={18} className="text-blue-400" />;
    if (verdict.includes('Testing') || verdict.includes('Running')) return <Loader2 size={18} className="text-blue-400 animate-spin" />;
    if (verdict.includes('Queue') || verdict === 'Submitted') return <Loader2 size={18} className="text-gray-400 animate-spin" />;
    if (verdict.includes('Timeout')) return <Clock size={18} className="text-orange-400" />;
    if (verdict.includes('Compilation')) return <XCircle size={18} className="text-orange-400" />;
    if (verdict.includes('Runtime')) return <XCircle size={18} className="text-purple-400" />;
    return <XCircle size={18} className="text-red-400" />;
}

export function getVerdictShort(verdict: string) {
    if (verdict === 'Accepted' || verdict === 'OK') return 'AC';
    if (verdict.includes('Wrong')) return 'WA';
    if (verdict.includes('Time Limit')) return 'TLE';
    if (verdict.includes('Memory')) return 'MLE';
    if (verdict.includes('Compilation')) return 'CE';
    if (verdict.includes('Runtime')) return 'RE';
    if (verdict.includes('Testing') || verdict.includes('Running')) return 'RUN';
    if (verdict.includes('Queue') || verdict === 'Submitted') return '...';
    if (verdict.includes('Timeout')) return 'T/O';
    return verdict.slice(0, 3).toUpperCase();
}

export function getCFStatusColor(cfStatus: CFSubmissionStatus | null) {
    if (!cfStatus) return 'text-[#666]';
    switch (cfStatus.status) {
        case 'submitting': return 'text-blue-400';
        case 'waiting': return 'text-yellow-400';
        case 'testing': return 'text-blue-400';
        case 'done':
            return cfStatus.verdict === 'OK' || cfStatus.verdict === 'Accepted'
                ? 'text-green-400'
                : 'text-red-400';
        case 'error': return 'text-red-400';
        default: return 'text-[#666]';
    }
}

export function getCFStatusBg(cfStatus: CFSubmissionStatus | null) {
    if (!cfStatus) return 'bg-white/5';
    switch (cfStatus.status) {
        case 'submitting': return 'bg-blue-500/10 border-blue-500/20';
        case 'waiting': return 'bg-yellow-500/10 border-yellow-500/20';
        case 'testing': return 'bg-blue-500/10 border-blue-500/20';
        case 'done':
            return cfStatus.verdict === 'OK' || cfStatus.verdict === 'Accepted'
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20';
        case 'error': return 'bg-red-500/10 border-red-500/20';
        default: return 'bg-white/5 border-white/10';
    }
}
