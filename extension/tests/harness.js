const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'background.js'), 'utf8');
// Speed up timers for the test.
src = src.replace('const LIVE_POLL_MS = 2000;', 'const LIVE_POLL_MS = 20;')
         .replace('const BRIDGE_IDLE_CLOSE_MS = 15_000;', 'const BRIDGE_IDLE_CLOSE_MS = 300;')
         .replace('const PAGE_DELAY_MS = 350;', 'const PAGE_DELAY_MS = 1;')
         .replace(/await sleep\(700\);/, 'await sleep(10);');

const log = [];
const state = { swBlocked: false, tabs: [], nextTabId: 100, pages: {}, broadcasts: [], tabCreates: 0, removed: [] };
const session = {}, local = {};
const mkStorage = (store) => ({
  get: async (k) => (k in store ? { [k]: store[k] } : {}),
  set: async (o) => Object.assign(store, o),
  remove: async (k) => { delete store[k]; },
});
const listeners = { updated: [] };
const chrome = {
  cookies: { onChanged: { addListener() {} }, getAll: async () => [{ name: 'JSESSIONID', value: 'abc' }, { name: 'X-User-Sha1', value: 'u1' }] },
  storage: { session: mkStorage(session), local: mkStorage(local) },
  runtime: { onMessage: { addListener() {} } },
  tabs: {
    onUpdated: { addListener: (f) => listeners.updated.push(f) },
    query: async ({ status }) => state.tabs.filter(t => !status || t.status === status),
    get: async (id) => { const t = state.tabs.find(t => t.id === id); if (!t) throw new Error('no tab'); return t; },
    create: async ({ url }) => { state.tabCreates++; const t = { id: state.nextTabId++, url, status: 'complete', active: false }; state.tabs.push(t); return t; },
    remove: async (id) => { state.removed.push(id); state.tabs = state.tabs.filter(t => t.id !== id); },
    sendMessage: async (id, msg) => { state.broadcasts.push(msg); },
  },
  scripting: {
    executeScript: async ({ target, func, args }) => {
      if (func.name === 'pageState') return [{ result: { title: 'Codeforces', ready: 'complete' } }];
      if (func.name === 'pageFetchHtml') { const r = serve(args[0]); return [{ result: r }]; }
      throw new Error('unexpected func ' + func.name);
    },
  },
};
function serve(path) {
  const page = state.pages[path.split('?')[0]] || state.pages[path];
  if (typeof page === 'function') return page(path);
  if (page) return { ok: true, status: 200, url: 'https://codeforces.com' + path, text: page };
  return { ok: true, status: 200, url: 'https://codeforces.com' + path, text: '<html>nothing</html>' };
}
const CHALLENGE = '<html><head><title>Just a moment...</title></head><script>window._cf_chl_opt={}</script></html>';
global.fetch = async (url) => {
  const u = new URL(url);
  if (state.swBlocked) return { ok: false, status: 403, url, text: async () => CHALLENGE };
  const r = serve(u.pathname + u.search);
  return { ok: r.ok, status: r.status, url: r.url, text: async () => r.text };
};
global.chrome = chrome;
global.navigator = { userAgent: 'test' };
const origLog = console.log; console.log = () => {};
eval(src + `\n;globalThis.__x = { cfFetchPage, isChallengePage, fetchSubmissionSource, trackLiveVerdict, parseStatusTable, isPendingVerdict, checkLogin };`);
console.log = origLog;
module.exports = { x: globalThis.__x, state, listeners, session, local, CHALLENGE };
