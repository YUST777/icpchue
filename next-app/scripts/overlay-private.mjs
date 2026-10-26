// Copies the private anti-cheat code over the public stubs before a build.
//   PRIVATE_REPO_DEPLOY_KEY  base64 of a read-only deploy key for YUST777/icpchue-private (Vercel)
//   PRIVATE_REPO_TOKEN  read-only GitHub token for the same repo (alternative to the deploy key)
//   PRIVATE_REPO_DIR    local clone of the private repo (development)
//   REQUIRE_PRIVATE=1   fail instead of building with the stubs
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = 'https://github.com/YUST777/icpchue-private.git';
const REPO_SSH = 'git@github.com:YUST777/icpchue-private.git';
const { PRIVATE_REPO_DEPLOY_KEY: deployKey, PRIVATE_REPO_TOKEN: token, PRIVATE_REPO_DIR: localDir, REQUIRE_PRIVATE: require } = process.env;
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
} else if (deployKey || token) {
    temp = mkdtempSync(join(tmpdir(), 'icpchue-private-'));
    const checkout = join(temp, 'repo');
    const args = ['clone', '--depth', '1', '--quiet'];
    const env = { ...process.env };
    if (deployKey) {
        const keyFile = join(temp, 'key');
        writeFileSync(keyFile, Buffer.from(deployKey, 'base64').toString('utf8'), { mode: 0o600 });
        env.GIT_SSH_COMMAND = `ssh -i ${keyFile} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null`;
        args.push(REPO_SSH, checkout);
    } else {
        const auth = Buffer.from(`x-access-token:${token}`).toString('base64');
        args.unshift('-c', `http.extraheader=AUTHORIZATION: basic ${auth}`);
        args.push(REPO, checkout);
    }
    try {
        execFileSync('git', args, { stdio: 'pipe', env });
    } catch {
        rmSync(temp, { recursive: true, force: true });
        fail('Could not clone the private repo (check PRIVATE_REPO_DEPLOY_KEY / PRIVATE_REPO_TOKEN).');
    }
    source = checkout;
}

if (!source) {
    if (require === '1') fail('REQUIRE_PRIVATE=1 but no PRIVATE_REPO_DEPLOY_KEY, PRIVATE_REPO_TOKEN or PRIVATE_REPO_DIR is set.');
    console.log('[overlay-private] no private source set, building with the public stubs.');
    process.exit(0);
}

cpSync(join(source, 'next-app'), appRoot, { recursive: true, force: true });
if (temp) rmSync(temp, { recursive: true, force: true });
console.log('[overlay-private] private code applied.');
