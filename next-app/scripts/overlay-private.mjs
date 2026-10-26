// Copies the private anti-cheat code over the public stubs before a build.
//   PRIVATE_REPO_TOKEN  read-only GitHub token for YUST777/icpchue-private (Vercel / CI)
//   PRIVATE_REPO_DIR    local clone of the private repo (development)
//   REQUIRE_PRIVATE=1   fail instead of building with the stubs
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = 'https://github.com/YUST777/icpchue-private.git';
const { PRIVATE_REPO_TOKEN: token, PRIVATE_REPO_DIR: localDir, REQUIRE_PRIVATE: require } = process.env;
const appRoot = resolve(import.meta.dirname, '..');

function fail(message) {
    console.error(`[overlay-private] ${message}`);
    process.exit(1);
}

let source = null;
let temp = null;
if (localDir) {
    source = resolve(localDir);
    if (!existsSync(join(source, 'next-app'))) fail(`PRIVATE_REPO_DIR has no next-app/: ${source}`);
} else if (token) {
    temp = mkdtempSync(join(tmpdir(), 'icpchue-private-'));
    const auth = Buffer.from(`x-access-token:${token}`).toString('base64');
    try {
        execFileSync('git', ['-c', `http.extraheader=AUTHORIZATION: basic ${auth}`, 'clone', '--depth', '1', '--quiet', REPO, temp], { stdio: 'pipe' });
    } catch {
        rmSync(temp, { recursive: true, force: true });
        fail('Could not clone the private repo (check PRIVATE_REPO_TOKEN).');
    }
    source = temp;
}

if (!source) {
    if (require === '1') fail('REQUIRE_PRIVATE=1 but no PRIVATE_REPO_TOKEN or PRIVATE_REPO_DIR is set.');
    console.log('[overlay-private] no private source set, building with the public stubs.');
    process.exit(0);
}

cpSync(join(source, 'next-app'), appRoot, { recursive: true, force: true });
if (temp) rmSync(temp, { recursive: true, force: true });
console.log('[overlay-private] private code applied.');
