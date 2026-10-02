import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const template = await readFile(resolve(root, '..', 'supabase/templates/confirmation.html'), 'utf8');
const sendRoute = await readFile(resolve(root, 'app/api/auth/send-otp/route.ts'), 'utf8');
const verifyRoute = await readFile(resolve(root, 'app/api/auth/verify-otp/route.ts'), 'utf8');
const applyPage = await readFile(resolve(root, 'app/apply/page.tsx'), 'utf8');
const adminLib = await readFile(resolve(root, 'lib/supabase/admin.ts'), 'utf8');
const registerRoute = await readFile(resolve(root, 'app/api/auth/register/route.ts'), 'utf8');
const intakeLib = await readFile(resolve(root, 'lib/apply/training-registration.ts'), 'utf8');
const { normalizeHorusEmail, isHorusEmail } = await import(resolve(root, 'lib/auth/horus-email.ts'));

assert.match(template, /Your ICPC HUE verification code/);
assert.match(template, /\{\{\s*\.Token\s*\}\}/, 'The email must render the six-digit Supabase token');
assert.match(template, /\{\{\s*\.Email\s*\}\}/, 'The email should identify the recipient');
assert.doesNotMatch(template, /ConfirmationURL/, 'OTP email must not contain a magic-link placeholder');
assert.doesNotMatch(template, /<a\b/i, 'OTP email must not fall back to a magic-link button');
assert.doesNotMatch(template, /height:4px;background:#d59928/i, 'The removed top accent rule must stay removed');

assert.match(sendRoute, /signInWithOtp/);
assert.match(sendRoute, /shouldCreateUser:\s*true/);
assert.match(sendRoute, /isHorusEmail\(normalizedEmail\)/);
assert.match(sendRoute, /send-otp-v2:/, 'send OTP IP limiter must use the shared-network policy key');
assert.match(sendRoute, /rateLimit\(`send-otp-v2:\$\{ip\}`,\s*30,\s*300\)/);
assert.ok(sendRoute.indexOf('const normalizedEmail') < sendRoute.indexOf('send-otp-v2:'), 'email validation must happen before the IP limiter');
assert.match(verifyRoute, /CODE_RE\s*=\s*\/\^\\d\{6\}\$\//);
assert.match(verifyRoute, /verifyOtp\(\{\s*email:\s*normalizedEmail,\s*token:\s*code,\s*type:\s*'email'/s);
assert.match(verifyRoute, /verify-otp-v2:/, 'verify OTP IP limiter must use the shared-network policy key');
assert.match(verifyRoute, /rateLimit\(`verify-otp-v2:\$\{ip\}`,\s*30,\s*300\)/);
assert.ok(verifyRoute.indexOf('const normalizedEmail') < verifyRoute.indexOf('verify-otp-v2:'), 'email validation must happen before the verify IP limiter');
assert.match(applyPage, /\/api\/auth\/send-otp/);
assert.match(applyPage, /\/api\/auth\/verify-otp/);
assert.match(applyPage, /\/api\/apply\/level0/);
assert.match(applyPage, /registrationFlow:\s*'level0'/);
assert.doesNotMatch(applyPage, /\/api\/apply\/level1/);
assert.match(applyPage, /isHorusEmail\(value\)/);
assert.match(verifyRoute, /normalizeHorusEmail\(email\)/);
assert.match(registerRoute, /normalizeHorusEmail\(email\)/);
assert.match(registerRoute, /rateLimit\(`register-v2:\$\{ip\}`,\s*60,\s*3600\)/, 'register IP limiter must allow shared campus networks');
assert.match(intakeLib, /-v2:\$\{ip\}`,\s*120,\s*3600\)/, 'intake IP limiter must allow shared campus networks');
assert.match(adminLib, /FROM auth\.users/, 'Auth lookup must use a direct indexed query, not paginate the Admin API');

// Email normalization behaviour: every visually-correct input must pass.
const ok = (input, expected) => {
    const out = normalizeHorusEmail(input);
    assert.equal(out, expected, `normalize(${JSON.stringify(input)})`);
    assert.ok(isHorusEmail(out), `${JSON.stringify(out)} should be a Horus email`);
};
ok('8251444@horus.edu.eg', '8251444@horus.edu.eg');
ok(' 8251444@Horus.Edu.EG ', '8251444@horus.edu.eg');
ok('8251444@horus.edu.eg\u200e', '8251444@horus.edu.eg');
ok('\u200f8251444@horus.edu.eg', '8251444@horus.edu.eg');
ok('8251\u200b444@horus.edu.eg', '8251444@horus.edu.eg');
ok('8251444@horus.edu.eg\u00a0', '8251444@horus.edu.eg');
ok('\u0668\u0662\u0665\u0661\u0664\u0664\u0664@horus.edu.eg', '8251444@horus.edu.eg');
ok('\uff18\uff12\uff15\uff11\uff14\uff14\uff14\uff20horus.edu.eg', '8251444@horus.edu.eg');
ok('8251444', '8251444@horus.edu.eg');
ok('\u0668\u0662\u0665\u0661\u0664\u0664\u0664', '8251444@horus.edu.eg');
ok('8251444@', '8251444@horus.edu.eg');
ok('8251444@horus.edu.eg.', '8251444@horus.edu.eg');
ok('8251444@hours.edu.eg', '8251444@horus.edu.eg');
ok('8251444@horus.edu', '8251444@horus.edu.eg');
ok('8251444@horus.edu.eg.com', '8251444@horus.edu.eg');
ok('first.last@horus.edu.eg', 'first.last@horus.edu.eg');
assert.ok(!isHorusEmail(normalizeHorusEmail('student@gmail.com')), 'Gmail must stay rejected');
assert.ok(!isHorusEmail(normalizeHorusEmail('8251444@gmail.com')), 'Gmail with an ID must stay rejected');
assert.ok(!isHorusEmail(normalizeHorusEmail('')), 'empty input is rejected');

console.log('OTP contract checks passed: template, send route, verify route, and /apply wiring.');
