/**
 * Structural code similarity (MOSS-style), used to find students whose
 * solutions to the same problem are the same code with cosmetic changes.
 *
 * Code is reduced to a token stream that ignores what copying usually changes
 * (variable names, literals, spacing, comments) and the standard template
 * (#include, using namespace, fast-IO lines). Overlapping k-grams of tokens
 * are hashed and "winnowed" to a fingerprint set; two submissions are compared
 * by how many fingerprints they share.
 */

const K = 5;      // tokens per k-gram
const WINDOW = 4; // winnowing window

const KEYWORDS = new Set([
    // C / C++
    'int', 'long', 'short', 'char', 'bool', 'float', 'double', 'void', 'unsigned', 'signed', 'auto',
    'const', 'static', 'struct', 'class', 'public', 'private', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'default', 'true', 'false', 'sizeof', 'new', 'delete',
    'string', 'vector', 'map', 'set', 'pair', 'cin', 'cout', 'endl', 'main', 'printf', 'scanf',
    'min', 'max', 'sort', 'abs', 'swap', 'floor', 'ceil', 'round', 'sqrt', 'pow', 'push_back', 'size',
    'begin', 'end', 'getline', 'to_string', 'stoi', 'size_t', 'll',
    // Python
    'def', 'in', 'not', 'and', 'or', 'elif', 'print', 'input', 'range', 'len', 'map', 'split', 'list',
    'str', 'None', 'True', 'False', 'is', 'lambda', 'pass',
    // Standard library names everyone uses (not evidence of copying)
    'fixed', 'setprecision', 'iostream', 'cmath', 'iomanip', 'algorithm', 'numeric', 'climits',
    'INT_MAX', 'INT_MIN', 'LLONG_MAX', 'LLONG_MIN', 'accumulate', 'reverse', 'unordered_map',
    'unordered_set', 'queue', 'stack', 'deque', 'priority_queue', 'greater', 'less', 'make_pair',
    'emplace_back', 'insert', 'erase', 'find', 'substr', 'length', 'empty', 'clear', 'front', 'back',
    'top', 'pop', 'push', 'tolower', 'toupper', 'isdigit', 'isalpha', 'isupper', 'islower', 'gcd', 'lcm',
    'memset', 'puts', 'gets', 'int64_t', 'uint64_t', 'float', 'nullptr', 'typedef', 'define', 'stdc',
    'int', 'append', 'join', 'strip', 'sorted', 'sum', 'abs', 'float', 'round', 'math', 'sys', 'stdin',
    'readline', 'exit', 'ord', 'chr', 'format', 'items', 'keys', 'values', 'enumerate', 'zip', 'dict',
    'tuple', 'Scanner', 'System', 'out', 'println', 'nextInt', 'nextLine', 'String', 'Main', 'args',
]);

// Identifiers too common to count as evidence when two students share them.
const COMMON_IDENTIFIERS = new Set([
    'main', 'cin', 'cout', 'endl', 'std', 'string', 'int', 'long', 'char', 'double', 'bool', 'vector',
    'input', 'print', 'range', 'split', 'map', 'list', 'len', 'sum', 'ans', 'res', 'result', 'count',
    'num', 'number', 'temp', 'tmp', 'max', 'min', 'flag', 'test', 'cases', 'case', 'arr', 'array', 'str',
    'name', 'value', 'size', 'index', 'first', 'second', 'total', 'answer', 'output', 'true', 'false',
]);

const TOKEN_RE = /[A-Za-z_]\w*|\d+(?:\.\d+)?|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|<<=|>>=|<<|>>|\+\+|--|->|&&|\|\||::|[<>=!+\-*/%&|^]=?|[{}()[\];,.:?~]/g;

/** Remove comments, preprocessor lines and the standard boilerplate. */
function stripBoilerplate(code: string): string {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        .split('\n')
        .filter((line) => {
            const t = line.trim();
            if (!t) return false;
            if (t.startsWith('#')) return false;                       // #include / #define / python comments
            if (/^using\s+namespace\b/.test(t)) return false;
            if (/^(import|from)\s+\w/.test(t)) return false;
            if (/sync_with_stdio|cin\.tie|cout\.tie/.test(t)) return false;
            if (/^return\s+0\s*;?\s*$/.test(t)) return false;
            return true;
        })
        .join('\n');
}

export interface Analyzed {
    tokens: number;               // normalized token count (after boilerplate)
    exactText: string;            // body with whitespace collapsed, names kept
    fingerprints: Set<number>;
    normalized: string;           // full normalized stream (identical-code check)
    identifiers: Set<string>;     // distinctive identifiers actually used
}

function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function analyze(code: string): Analyzed {
    const body = stripBoilerplate(code || '');
    const raw = body.match(TOKEN_RE) || [];
    const identifiers = new Set<string>();
    const toks = raw.map((t) => {
        if (/^[A-Za-z_]/.test(t)) {
            if (KEYWORDS.has(t)) return t;
            if (t.length >= 4 && !COMMON_IDENTIFIERS.has(t.toLowerCase())) identifiers.add(t);
            return 'V';
        }
        if (/^\d/.test(t)) return 'N';
        if (t[0] === '"' || t[0] === "'") return 'S';
        return t;
    });

    const grams: number[] = [];
    for (let i = 0; i + K <= toks.length; i++) grams.push(hash(toks.slice(i, i + K).join(' ')));

    // Winnowing: keep the minimum hash of every window (rightmost on ties).
    const fingerprints = new Set<number>();
    if (grams.length <= WINDOW) {
        grams.forEach((g) => fingerprints.add(g));
    } else {
        for (let i = 0; i + WINDOW <= grams.length; i++) {
            let min = grams[i];
            for (let j = i + 1; j < i + WINDOW; j++) if (grams[j] <= min) min = grams[j];
            fingerprints.add(min);
        }
    }
    return { tokens: toks.length, exactText: raw.join(' '), fingerprints, normalized: toks.join(' '), identifiers };
}

/** 0..1: share of fingerprints in common (Dice coefficient); 1 for identical structure. */
export function similarity(a: Analyzed, b: Analyzed): number {
    if (a.normalized && a.normalized === b.normalized) return 1;
    if (a.fingerprints.size === 0 || b.fingerprints.size === 0) return 0;
    let shared = 0;
    const [small, large] = a.fingerprints.size <= b.fingerprints.size ? [a.fingerprints, b.fingerprints] : [b.fingerprints, a.fingerprints];
    for (const f of small) if (large.has(f)) shared++;
    return (2 * shared) / (a.fingerprints.size + b.fingerprints.size);
}

/** Distinctive identifiers both submissions use (e.g. "first_digit"). */
export function sharedIdentifiers(a: Analyzed, b: Analyzed): string[] {
    return [...a.identifiers].filter((id) => b.identifiers.has(id));
}
