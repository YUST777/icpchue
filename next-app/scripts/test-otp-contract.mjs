import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const template = await readFile(resolve(root, '..', 'supabase/templates/confirmation.html'), 'utf8');
const sendRoute = await readFile(resolve(root, 'app/api/auth/send-otp/route.ts'), 'utf8');
const verifyRoute = await readFile(resolve(root, 'app/api/auth/verify-otp/route.ts'), 'utf8');
const applyPage = await readFile(resolve(root, 'app/apply/page.tsx'), 'utf8');

assert.match(template, /Your ICPC HUE verification code/);
assert.match(template, /\{\{\s*\.Token\s*\}\}/, 'The email must render the six-digit Supabase token');
assert.match(template, /\{\{\s*\.Email\s*\}\}/, 'The email should identify the recipient');
assert.doesNotMatch(template, /ConfirmationURL/, 'OTP email must not contain a magic-link placeholder');
assert.doesNotMatch(template, /<a\b/i, 'OTP email must not fall back to a magic-link button');
assert.doesNotMatch(template, /height:4px;background:#d59928/i, 'The removed top accent rule must stay removed');

assert.match(sendRoute, /signInWithOtp/);
assert.match(sendRoute, /shouldCreateUser:\s*true/);
assert.match(sendRoute, /horus\\\.edu\\\.eg/);
assert.match(verifyRoute, /CODE_RE\s*=\s*\/\^\\d\{6\}\$\//);
assert.match(verifyRoute, /verifyOtp\(\{\s*email:\s*normalizedEmail,\s*token:\s*code,\s*type:\s*'email'/s);
assert.match(applyPage, /\/api\/auth\/send-otp/);
assert.match(applyPage, /\/api\/auth\/verify-otp/);
assert.match(applyPage, /\/api\/apply\/level0/);
assert.match(applyPage, /registrationFlow:\s*'level0'/);
assert.doesNotMatch(applyPage, /\/api\/apply\/level1/);

console.log('OTP contract checks passed: template, send route, verify route, and /apply wiring.');
