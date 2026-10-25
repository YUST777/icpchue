import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const middleware = await readFile(resolve(root, 'lib/supabase/middleware.ts'), 'utf8');
const forgotRoute = await readFile(resolve(root, 'app/api/auth/forgot-password/route.ts'), 'utf8');
const resetRoute = await readFile(resolve(root, 'app/api/auth/reset-password/route.ts'), 'utf8');
const resetPage = await readFile(resolve(root, 'app/reset-password/page.tsx'), 'utf8');
const recoveryTemplate = await readFile(resolve(root, '..', 'supabase/templates/recovery.html'), 'utf8');

const authOnlyMatch = middleware.match(/export const AUTH_ONLY_PAGES = \[([^\]]*)\]/);
assert.ok(authOnlyMatch, 'middleware must define the authenticated-user redirect pages');
const authOnlyPages = [...authOnlyMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.ok(authOnlyPages.includes('/forgot-password'), 'signed-in users should not need the forgot-password form');
assert.ok(!authOnlyPages.includes('/reset-password'), 'recovery page must remain accessible even with an existing session');
assert.match(middleware, /AUTH_ONLY_PAGES\.includes\(pathname\)/, 'exact auth-only route list must control redirects');

assert.match(forgotRoute, /RESET_REDIRECT_URL\s*=\s*'https:\/\/icpchue\.com\/reset-password'/);
assert.match(forgotRoute, /resetPasswordForEmail\(normalizedEmail,\s*\{\s*redirectTo:\s*RESET_REDIRECT_URL,?\s*\}\)/s);
assert.match(recoveryTemplate, /href="\{\{\s*\.RedirectTo\s*\}\}\?token_hash=\{\{\s*\.TokenHash\s*\}\}&amp;type=recovery"/);
assert.doesNotMatch(recoveryTemplate, /\.SiteURL[^\n]*token_hash/, 'recovery link must use the requested redirect URL');
assert.match(resetPage, /query\.get\('token_hash'\)/, 'reset page must read the recovery token hash from the email link');
assert.match(resetRoute, /verifyOtp\(\{\s*token_hash:\s*tokenHash,\s*type:\s*'recovery'\s*\}\)/s);
assert.match(resetRoute, /updateUserById\(userData\.user\.id,\s*\{\s*password:\s*newPassword\s*\}\)/s);

console.log('Password-reset contract checks passed: route access, email redirect, token verification, and password update.');
