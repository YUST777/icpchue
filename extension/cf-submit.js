/**
 * Verdict Helper — Codeforces submit page (isolated world).
 *
 * When the student clicks Submit on ICPC HUE, the site hands the code to the
 * extension (VERDICT_PREPARE_SUBMIT). On the Codeforces submit page this
 * script asks the background for that pending code and fills the form:
 * problem, language, and source. It never presses Submit for the student.
 *
 * The Ace editor lives in the page's own JS context, so the actual editor
 * update happens in cf-submit-main.js (MAIN world) via a window message.
 */
(() => {
    const match = location.pathname.match(
        /^\/(?:(contest|gym)\/(\d+)|group\/([^/]+)\/contest\/(\d+))\/submit(?:\/([A-Za-z0-9]+))?\/?$/
    );
    if (!match) return;

    const contestId = match[2] || match[4];
    const groupId = match[3] || null;
    const problemIndex = (match[5] || new URLSearchParams(location.search).get('problemIndex') || '').toUpperCase();
    if (!contestId || !problemIndex) return;

    const key = `${groupId || ''}:${contestId}:${problemIndex}`;

    function showBanner(text, ok) {
        const el = document.createElement('div');
        el.textContent = text;
        el.setAttribute('role', 'status');
        el.style.cssText = [
            'position:fixed', 'top:14px', 'left:50%', 'transform:translateX(-50%)', 'z-index:2147483647',
            'padding:10px 16px', 'border-radius:10px', 'font:600 13px/1.4 system-ui,sans-serif',
            `background:${ok ? '#E8C15A' : '#3a2a2a'}`, `color:${ok ? '#15120c' : '#fff'}`,
            'box-shadow:0 8px 24px rgba(0,0,0,.25)',
        ].join(';');
        document.documentElement.appendChild(el);
        setTimeout(() => el.remove(), 6000);
    }

    // Pick the newest compiler for the chosen language by matching option text,
    // so this keeps working when Codeforces renumbers programTypeId values.
    const LANGUAGE_PREFS = {
        cpp: [/G\+\+\s*23/i, /G\+\+\s*20/i, /G\+\+\s*17/i, /G\+\+/i],
        c: [/GCC\s*C11/i, /\bC11\b/i, /\bGCC\b/i],
        python: [/^Python\s*3/i, /Python\s*3/i, /PyPy\s*3/i],
        java: [/Java\s*2\d/i, /Java\s*1\d/i, /Java/i],
        kotlin: [/Kotlin\s*2/i, /Kotlin\s*1\.9/i, /Kotlin/i],
    };

    function pickLanguage(select, language) {
        const prefs = LANGUAGE_PREFS[language];
        if (!select || !prefs) return false;
        const options = Array.from(select.options).filter((o) => o.value && !o.disabled);
        for (const re of prefs) {
            // Codeforces lists newer versions later; prefer the last match.
            const hit = options.filter((o) => re.test(o.textContent.trim())).pop();
            if (hit) {
                select.value = hit.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }
        return false;
    }

    function fill(pending) {
        const form = document.querySelector('form.submit-form') || document.querySelector('form[action*="submit"]');
        const textarea = document.querySelector('#sourceCodeTextarea, textarea[name="source"]');
        if (!form || !textarea) return false;

        const problemSelect = form.querySelector('select[name="submittedProblemIndex"]');
        if (problemSelect && Array.from(problemSelect.options).some((o) => o.value === problemIndex)) {
            problemSelect.value = problemIndex;
            problemSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const langOk = pickLanguage(form.querySelector('select[name="programTypeId"]'), pending.language);

        textarea.value = pending.code;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Ace editor (if enabled) is updated in the page context.
        window.postMessage({ type: 'VERDICT_FILL_ACE', code: pending.code }, location.origin);

        showBanner(
            langOk
                ? 'ICPC HUE: your code is pasted. Check it and press Submit.'
                : 'ICPC HUE: your code is pasted. Choose the language, then press Submit.',
            true
        );
        return true;
    }

    async function run() {
        let pending = null;
        // The site sends the code just before opening this tab; allow a short race.
        for (let i = 0; i < 10 && !pending; i += 1) {
            try {
                const res = await chrome.runtime.sendMessage({ type: 'TAKE_PENDING_SUBMIT', key });
                pending = res && res.pending;
            } catch {
                return;
            }
            if (!pending) await new Promise((r) => setTimeout(r, 300));
        }
        if (!pending) return;

        // The form can render slightly after document_idle on slow connections.
        for (let i = 0; i < 20; i += 1) {
            if (fill(pending)) return;
            await new Promise((r) => setTimeout(r, 250));
        }
        showBanner('ICPC HUE: could not find the code box. Your code is also in the clipboard: paste it with Ctrl+V.', false);
    }

    run();
})();
