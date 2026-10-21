/** Installed Verdict Helper version from the marker its content script adds, or null. */
export function installedExtensionVersion(): string | null {
    if (typeof document === 'undefined') return null;
    return document.getElementById('verdict-extension-installed')?.getAttribute('data-version') || null;
}

/** True when the installed extension is at least `min` (e.g. "1.5.0"). */
export function extensionAtLeast(min: string): boolean {
    const v = installedExtensionVersion();
    if (!v) return false;
    const a = v.split('.').map(Number);
    const b = min.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return true;
}

/**
 * Since 1.5.0 the extension verifies a submission page really is the requested
 * submission (Codeforces redirects foreign/missing ids to the last one viewed).
 * Older versions could return another submission's code, so their source must
 * never be saved.
 */
export const SAFE_SOURCE_EXTENSION = '1.5.0';
