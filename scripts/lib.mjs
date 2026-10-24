import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const repository = 'IsaacHuo/OpenLab';
export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function command(executable, args, options = {}) {
  return execFileSync(executable, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000, windowsHide: true, ...options }).trim();
}
export function ghApi(path, { method = 'GET', body } = {}) {
  const args = ['api', path, '--method', method, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
  if (body !== undefined) args.push('--input', '-');
  // Reads and full-state PATCH/PUT requests are idempotent. Never retry POST creation blindly.
  const attempts = ['GET', 'PATCH', 'PUT'].includes(method) ? 3 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = command('gh', args, body === undefined ? {} : { input: JSON.stringify(body) });
      return result ? JSON.parse(result) : null;
    } catch (error) {
      if (attempt === attempts || /HTTP 4\d\d/.test(String(error.stderr))) throw error;
    }
  }
}
