/**
 * Verdict Helper — Codeforces submit page (MAIN world).
 * Receives the code from cf-submit.js and puts it into the Ace editor, which
 * is only reachable from the page's own JavaScript context.
 */
(() => {
    window.addEventListener('message', (event) => {
        if (event.source !== window || event.origin !== location.origin) return;
        const data = event.data || {};
        if (data.type !== 'VERDICT_FILL_ACE' || typeof data.code !== 'string') return;
        try {
            if (!window.ace) return;
            document.querySelectorAll('.ace_editor').forEach((el) => {
                const editor = window.ace.edit(el); // returns the existing instance
                editor.setValue(data.code, -1);
                editor.clearSelection();
            });
        } catch {
            // The plain textarea was already filled by cf-submit.js.
        }
    });
})();
