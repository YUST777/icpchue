// Simulated Chrome + Codeforces tests for background.js. Run: node extension/tests/run.js
const { x, state, session, local, CHALLENGE } = require('./harness');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const now = () => Math.floor(Date.now() / 1000);
const row = (id, idx, verdict, ts) => `<tr data-submission-id="${id}"><td>${id}</td><td><span data-timestamp="${ts}">x</span></td><td>me</td><td><a href="/group/G/contest/1/problem/${idx}">${idx} - P</a></td><td>C++</td><td>${verdict}</td><td>15 ms</td><td>100 KB</td></tr>`;
const statusPage = (rows) => `<html><title>Status</title><span>UTC+3</span><table class="status-frame-datatable">${rows.join('')}</table></html>`;
const MY = '/group/G/contest/1/my';

(async () => {
  // 1. Challenge detection
  check('normal page with Cloudflare jsd script is NOT a challenge',
    !x.isChallengePage({ status: 200 }, '<html><title>Codeforces</title><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script><table class="status-frame-datatable"></table></html>'));
  check('real challenge page IS a challenge', x.isChallengePage({ status: 403 }, CHALLENGE));
  check('403 cloudflare block IS a challenge', x.isChallengePage({ status: 403 }, '<html>cloudflare ray id</html>'));

  // 2. Verdict classification
  const verdicts = { 'In queue': true, 'Running on test 7': true, 'Compiling': true, 'Compilation error': false, 'Accepted': false, 'Wrong answer on test 2': false, 'Time limit exceeded on test 3': false, 'Runtime error on test 1': false, 'Memory limit exceeded on test 9': false, 'Idleness limit exceeded on test 1': false, 'Skipped': false, 'Hacked': false, 'Partial result: 50 points': false };
  check('every verdict classified correctly', Object.entries(verdicts).every(([v, p]) => x.isPendingVerdict(v) === p));

  // 3. Source page redirected to another submission is rejected
  state.pages['/group/G/contest/1/submission/111'] = () => ({ ok: true, status: 200, url: 'https://codeforces.com/group/G/contest/1/submission/222', text: '<title>Submission #222 - Codeforces</title><pre id="program-source-text">other code</pre>' });
  let r = await x.fetchSubmissionSource({ contestId: 1, urlType: 'group', groupId: 'G', submissionId: 111 });
  check('redirected submission page rejected', !r.success && r.error === 'SUBMISSION_NOT_FOUND', JSON.stringify(r));
  state.pages['/group/G/contest/1/submission/333'] = '<title>Submission #333 - Codeforces</title><pre id="program-source-text">int main(){ return a &amp;&amp; b &lt; c; }</pre>';
  r = await x.fetchSubmissionSource({ contestId: 1, urlType: 'group', groupId: 'G', submissionId: 333 });
  check('correct submission page read + HTML decoded', r.success && r.sourceCode === 'int main(){ return a && b < c; }', JSON.stringify(r));

  // 4. Cloudflare blocks background: 3 concurrent reads, no Codeforces tab -> exactly ONE tab opened, then closed
  state.swBlocked = true; state.tabs = []; state.tabCreates = 0; state.removed = [];
  state.pages[MY] = statusPage([row(5, 'A', 'Accepted', now() - 9999)]);
  const rs = await Promise.all([x.cfFetchPage('https://codeforces.com' + MY), x.cfFetchPage('https://codeforces.com' + MY), x.cfFetchPage('https://codeforces.com' + MY)]);
  check('3 concurrent blocked reads all succeed via tab', rs.every(p => !p.error && p.via === 'tab'), JSON.stringify(rs.map(p => p.error || p.via)));
  check('only ONE background tab opened', state.tabCreates === 1, `created ${state.tabCreates}`);
  await sleep(500);
  check('background tab closed after idle', state.tabs.length === 0 && state.removed.length === 1, `open=${state.tabs.length} removed=${state.removed.length}`);
  check('bridge tab id cleared from session storage', !('cfBridgeTabId' in session));

  // 5. A tab the student switched to is never closed
  state.tabCreates = 0; state.removed = [];
  const p5 = x.cfFetchPage('https://codeforces.com' + MY); await p5;
  state.tabs.forEach(t => t.active = true);
  await sleep(500);
  check('active (student-used) tab NOT closed', state.removed.length === 0 && state.tabs.length === 1);
  state.tabs = [];

  // 6. Student's own Codeforces tab is used, no new tab
  state.tabs = [{ id: 7, url: 'https://codeforces.com/', status: 'complete', active: true }]; state.tabCreates = 0;
  const p6 = await x.cfFetchPage('https://codeforces.com' + MY);
  check("uses the student's open Codeforces tab, opens none", !p6.error && state.tabCreates === 0);
  state.tabs = [];

  // 7. Interactive challenge even inside a tab -> clear error, tab closed
  const saved = state.pages[MY]; state.pages[MY] = () => ({ ok: false, status: 403, url: 'https://codeforces.com' + MY, text: CHALLENGE });
  state.tabCreates = 0; state.removed = [];
  const p7 = await x.cfFetchPage('https://codeforces.com' + MY);
  check('challenge everywhere -> error mentioning CLOUDFLARE', p7.error && /CLOUDFLARE/.test(p7.error), p7.error);
  await sleep(500);
  check('…and the tab it opened is closed', state.tabs.length === 0);
  state.pages[MY] = saved; state.swBlocked = false;

  session.icpcTabIds = [999]; // an open icpchue problem page
  // 8. Live: visiting /my with nothing new -> no broadcast
  state.broadcasts = []; state.pages[MY] = statusPage([row(10, 'A', 'Accepted', now() - 3600)]);
  await x.trackLiveVerdict({ contestId: '1', urlType: 'group', groupId: 'G' });
  check('visit with no new submission -> no live update', state.broadcasts.length === 0);

  // 9. Live: two submissions, second made while first is judged; both reach final
  let tick = 0;
  state.broadcasts = [];
  state.pages[MY] = () => {
    tick++;
    const rows = [];
    rows.push(row(20, 'A', tick < 3 ? 'Running on test ' + tick : 'Wrong answer on test 2', now() - 5));
    if (tick >= 2) rows.push(row(21, 'B', tick < 6 ? 'In queue' : 'Accepted', now() - 1));
    rows.push(row(10, 'A', 'Accepted', now() - 3600));
    return { ok: true, status: 200, url: 'https://codeforces.com' + MY, text: statusPage(rows) };
  };
  const t1 = x.trackLiveVerdict({ contestId: '1', urlType: 'group', groupId: 'G' });
  await sleep(30);
  x.trackLiveVerdict({ contestId: '1', urlType: 'group', groupId: 'G' }); // second "page load" while active
  await t1;
  const finals = state.broadcasts.filter(b => !b.pending).map(b => `${b.submissionId}:${b.problemIndex}:${b.verdict}`);
  check('both submissions reported final', finals.includes('20:A:Wrong answer on test 2') && finals.includes('21:B:Accepted'), finals.join(', '));
  check('old Accepted (1h ago) never broadcast', !state.broadcasts.some(b => b.submissionId === 10));
  check('no duplicate final messages', new Set(finals).size === finals.length, finals.join(', '));

  // 10. Login: Cloudflare blocks homepage, same session verified before -> logged in with saved handle
  state.swBlocked = false;
  state.pages['/'] = '<html><a href="/logout">Logout</a><div class="personal-sidebar"><a href="/profile/BusinessDuck1">me</a></div></html>';
  let L = await x.checkLogin();
  check('login verified normally', L.loggedIn && L.handle === 'BusinessDuck1');
  state.swBlocked = true; state.tabs = []; state.pages['/'] = () => ({ ok: false, status: 403, url: 'https://codeforces.com/', text: CHALLENGE });
  state.tabCreates = 0;
  L = await x.checkLogin();
  check('blocked homepage -> saved login for same session, no tab opened', L.loggedIn && L.handle === 'BusinessDuck1' && state.tabCreates === 0, JSON.stringify(L) + ' tabs=' + state.tabCreates);
  await sleep(400);
  state.tabs = [];

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
