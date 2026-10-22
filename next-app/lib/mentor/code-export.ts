/**
 * Client-side export builders for the mentor "Code Inspector".
 * No server round-trip: everything is built from the already loaded code catalog.
 */

export interface ExportCodeEntry {
    key: string;
    display_label?: string;
    sheet_name?: string;
    problem_title?: string;
    contest_id: string;
    problem_id: string;
    code: string;
    language?: string;
    verdict?: string;
    status?: string;
    attempts?: number;
    updated_at: string;
}

export interface ExportTrainee {
    name: string;
    studentId: string;
    handle?: string;
}

export type ExportFormat = 'markdown' | 'zip' | 'single';

export interface ExportOptions {
    format: ExportFormat;
    includeMeta: boolean; // verdict / attempts / date header per problem
    lineNumbers: boolean; // markdown only
}

export function sheetGroup(e: ExportCodeEntry): string {
    const parts = (e.display_label || '').split(' / ');
    return parts.length >= 3 ? parts.slice(0, 2).join(' / ') : 'Other';
}

export function entryTitle(e: ExportCodeEntry): string {
    const label = e.display_label || `${e.contest_id} ${e.problem_id}`;
    return e.problem_title ? `${label} - ${e.problem_title}` : label;
}

export function verdictLabel(e: ExportCodeEntry): string {
    if (e.status === 'SOLVED') return 'Accepted';
    if (e.status === 'DRAFT') return 'Draft';
    return e.verdict || 'Attempted';
}

export function extensionFor(language?: string): string {
    const l = (language || '').toLowerCase();
    if (l.includes('c++') || l.includes('cpp')) return 'cpp';
    if (l.includes('python') || l.includes('pypy')) return 'py';
    if (l.includes('java') && !l.includes('script')) return 'java';
    if (l.includes('javascript') || l.includes('node')) return 'js';
    if (l.includes('kotlin')) return 'kt';
    if (l.includes('rust')) return 'rs';
    if (l.includes('go')) return 'go';
    if (l.includes('c#') || l.includes('csharp')) return 'cs';
    if (/^(gnu )?c(\d+)?$/.test(l) || l.includes('gnu c11') || l.startsWith('c ')) return 'c';
    return 'txt';
}

function fenceLang(language?: string): string {
    const ext = extensionFor(language);
    return ext === 'txt' ? '' : ext === 'py' ? 'python' : ext === 'kt' ? 'kotlin' : ext === 'rs' ? 'rust' : ext === 'cs' ? 'csharp' : ext === 'js' ? 'javascript' : ext;
}

function slug(s: string): string {
    return s
        .normalize('NFKD')
        .replace(/[^\w\s.-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'x';
}

export function safeFileBase(t: ExportTrainee): string {
    return slug(`${t.studentId}_${t.name}`);
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function groupEntries(entries: ExportCodeEntry[]): [string, ExportCodeEntry[]][] {
    const map = new Map<string, ExportCodeEntry[]>();
    for (const e of entries) {
        const g = sheetGroup(e);
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b, undefined, { numeric: true })));
}

function summaryCounts(entries: ExportCodeEntry[]) {
    const solved = entries.filter((e) => e.status === 'SOLVED').length;
    const drafts = entries.filter((e) => e.status === 'DRAFT').length;
    return { total: entries.length, solved, drafts, attempted: entries.length - solved - drafts };
}

function numbered(code: string): string {
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    const w = String(lines.length).length;
    return lines.map((l, i) => `${String(i + 1).padStart(w, ' ')} | ${l}`).join('\n');
}

/* ---------------------------------- Markdown ---------------------------------- */

export function buildMarkdown(t: ExportTrainee, entries: ExportCodeEntry[], o: ExportOptions): string {
    const c = summaryCounts(entries);
    const out: string[] = [];
    out.push(`# Code Review - ${t.name}`);
    out.push('');
    out.push(`- **Student ID:** ${t.studentId}`);
    if (t.handle) out.push(`- **Codeforces:** ${t.handle}`);
    out.push(`- **Exported:** ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
    out.push(`- **Problems:** ${c.total} (${c.solved} accepted, ${c.attempted} attempted, ${c.drafts} drafts)`);
    out.push('');
    out.push('## Contents');
    out.push('');
    const groups = groupEntries(entries);
    for (const [g, list] of groups) {
        out.push(`**${g}**`);
        for (const e of list) {
            out.push(`- ${entryTitle(e)} - ${verdictLabel(e)}`);
        }
        out.push('');
    }
    out.push('---');
    out.push('');
    for (const [g, list] of groups) {
        out.push(`## ${g}`);
        out.push('');
        for (const e of list) {
            out.push(`### ${entryTitle(e)}`);
            out.push('');
            if (o.includeMeta) {
                const bits = [`**${verdictLabel(e)}**`];
                if (e.attempts) bits.push(`${e.attempts} attempt${e.attempts === 1 ? '' : 's'}`);
                if (e.language) bits.push(e.language);
                const d = fmtDate(e.updated_at);
                if (d) bits.push(d);
                out.push(bits.join(' | '));
                out.push('');
            }
            const body = o.lineNumbers ? numbered(e.code) : e.code.replace(/\r\n/g, '\n');
            const longest = Math.max(2, ...(body.match(/`+/g) || ['']).map((m) => m.length));
            const fence = '`'.repeat(longest + 1);
            out.push(`${fence}${o.lineNumbers ? '' : fenceLang(e.language)}`);
            out.push(body.replace(/\n+$/, ''));
            out.push(fence);
            out.push('');
        }
    }
    return out.join('\n');
}

/* ------------------------------ Single source file ------------------------------ */

export function buildSingleFile(t: ExportTrainee, entries: ExportCodeEntry[], o: ExportOptions): { text: string; ext: string } {
    const exts = new Set(entries.map((e) => extensionFor(e.language)));
    const ext = exts.size === 1 ? [...exts][0] : 'txt';
    const lineComment = ext === 'py' ? '#' : '//';
    const bar = lineComment + ' ' + '='.repeat(70);
    const out: string[] = [`${lineComment} ${t.name} (${t.studentId})${t.handle ? ` - CF: ${t.handle}` : ''}`, `${lineComment} ${entries.length} problems`, ''];
    for (const e of entries) {
        out.push(bar);
        out.push(`${lineComment} ${entryTitle(e)}`);
        if (o.includeMeta) {
            out.push(`${lineComment} ${verdictLabel(e)}${e.attempts ? ` | ${e.attempts} attempts` : ''}${e.language ? ` | ${e.language}` : ''} | ${fmtDate(e.updated_at)}`);
        }
        out.push(bar);
        out.push(e.code.replace(/\r\n/g, '\n').replace(/\n+$/, ''));
        out.push('', '');
    }
    return { text: out.join('\n'), ext };
}

/* ------------------------------------- ZIP ------------------------------------- */

let crcTable: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
    if (!crcTable) {
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal store-only (no compression) ZIP writer with UTF-8 file names. */
export function buildZip(files: { path: string; content: string }[]): Blob {
    const enc = new TextEncoder();
    const parts: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    for (const f of files) {
        const name = enc.encode(f.path);
        const data = enc.encode(f.content);
        const crc = crc32(data);

        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true);
        lh.setUint16(4, 20, true);
        lh.setUint16(6, 0x0800, true); // UTF-8 names
        lh.setUint16(8, 0, true);
        lh.setUint16(10, dosTime, true);
        lh.setUint16(12, dosDate, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, data.length, true);
        lh.setUint32(22, data.length, true);
        lh.setUint16(26, name.length, true);
        lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, data);

        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true);
        ch.setUint16(4, 20, true);
        ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, 0, true);
        ch.setUint16(12, dosTime, true);
        ch.setUint16(14, dosDate, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, data.length, true);
        ch.setUint32(24, data.length, true);
        ch.setUint16(28, name.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);

        offset += 30 + name.length + data.length;
    }

    const centralSize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}

export function buildZipFiles(t: ExportTrainee, entries: ExportCodeEntry[], o: ExportOptions): { path: string; content: string }[] {
    const used = new Set<string>();
    const files = entries.map((e) => {
        const folder = slug(sheetGroup(e).replace(/\s*\/\s*/g, '_'));
        const base = slug(`${e.contest_id}${e.problem_id}_${verdictLabel(e)}`);
        let path = `${folder}/${base}.${extensionFor(e.language)}`;
        for (let n = 2; used.has(path); n++) path = `${folder}/${base}_${n}.${extensionFor(e.language)}`;
        used.add(path);
        const c = e.code.replace(/\r\n/g, '\n');
        const cm = extensionFor(e.language) === 'py' ? '#' : '//';
        const header = o.includeMeta
            ? `${cm} ${entryTitle(e)}\n${cm} ${verdictLabel(e)}${e.attempts ? ` | ${e.attempts} attempts` : ''} | ${fmtDate(e.updated_at)}\n\n`
            : '';
        return { path, content: header + c };
    });
    const idx = ['# ' + t.name + ' (' + t.studentId + ')', '', ...entries.map((e, i) => `- ${files[i].path} - ${entryTitle(e)} (${verdictLabel(e)})`)].join('\n');
    files.unshift({ path: 'INDEX.md', content: idx + '\n' });
    return files;
}

/* ---------------------------------- Download ---------------------------------- */

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function runExport(t: ExportTrainee, entries: ExportCodeEntry[], o: ExportOptions): string {
    const base = `code_${safeFileBase(t)}`;
    let name = '';
    if (o.format === 'markdown') {
        name = `${base}.md`;
        downloadBlob(new Blob([buildMarkdown(t, entries, o)], { type: 'text/markdown;charset=utf-8' }), name);
    } else if (o.format === 'single') {
        const { text, ext } = buildSingleFile(t, entries, o);
        name = `${base}.${ext}`;
        downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), name);
    } else {
        name = `${base}.zip`;
        downloadBlob(buildZip(buildZipFiles(t, entries, o)), name);
    }
    return name;
}
