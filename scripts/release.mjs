import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { command, ghApi, readJson, repository } from './lib.mjs';

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;
export function releaseSection(version, changelog) {
  if (version !== version.trim() || !semver.test(version)) throw new Error('Use a semantic version without the v prefix (for example 0.0.1 or 0.1.0-alpha.1).');
  const heading = `## [${version}] - `;
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1 || !/^\d{4}-\d{2}-\d{2}$/.test(lines[start].slice(heading.length))) throw new Error('Version requires a dated CHANGELOG section.');
  let end = lines.findIndex((line, index) => index > start && (/^## /.test(line) || /^\[[^\]]+\]:/.test(line)));
  if (end === -1) end = lines.length;
  const notes = lines.slice(start + 1, end).join('\n').trim();
  if (!notes || !/^### /m.test(notes)) throw new Error('Release notes must describe delivered changes.');
  return notes;
}

export function assertVersion(version, recorded, packageVersion, lockVersion) {
  if ([recorded, packageVersion, lockVersion].some((value) => value !== version)) throw new Error('Input, VERSION, package.json and package-lock.json must agree.');
}

export function assertReleaseContext(sha, mainSha, runs, tagExists) {
  if (!/^[a-f0-9]{40}$/.test(sha) || sha !== mainSha) throw new Error('Release target must be the current main commit.');
  if (tagExists) throw new Error('Release tag already exists; published versions are immutable.');
  if (!runs.some((run) => run.head_sha === sha && run.event === 'push' && run.status === 'completed' && run.conclusion === 'success' && run.path === '.github/workflows/checks.yml')) throw new Error('Repository checks must pass on the exact main commit before release.');
}

function remoteTagExists(tag) {
  try { ghApi(`repos/${repository}/git/ref/tags/${tag}`); return true; }
  catch (error) { if (/HTTP 404/.test(String(error.stderr))) return false; throw error; }
}

function check(version) {
  const recorded = readFileSync('VERSION', 'utf8').trim();
  assertVersion(version, recorded, readJson('package.json').version, readJson('package-lock.json').version);
  const notes = releaseSection(version, readFileSync('CHANGELOG.md', 'utf8'));
  const sha = command('git', ['rev-parse', 'HEAD']);
  const mainSha = ghApi(`repos/${repository}/git/ref/heads/main`).object.sha;
  const runs = ghApi(`repos/${repository}/actions/workflows/checks.yml/runs?head_sha=${sha}&event=push&per_page=100`).workflow_runs;
  const tag = `v${version}`;
  assertReleaseContext(sha, mainSha, runs, remoteTagExists(tag));
  if (command('git', ['status', '--porcelain'])) throw new Error('Release checkout has uncommitted files.');
  if (command('git', ['tag', '--list', tag])) throw new Error('Tag already exists locally.');
  return { version, tag, sha, notes };
}

function run() {
  const [mode = 'check', requested] = process.argv.slice(2);
  if (!['check', 'publish'].includes(mode)) throw new Error('Usage: node scripts/release.mjs check|publish [version]');
  const version = requested ?? readFileSync('VERSION', 'utf8').trim();
  const release = check(version);
  console.log(`Release validation passed: ${release.tag} at ${release.sha}`);
  if (mode === 'check') return;
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Publish only through the manually dispatched main-branch release workflow.');
  const generated = ghApi(`repos/${repository}/releases/generate-notes`, { method: 'POST', body: { tag_name: release.tag, target_commitish: release.sha, configuration_file_path: '.github/release.yml' } });
  mkdirSync('.cache/release', { recursive: true });
  const notesPath = '.cache/release/notes.md';
  writeFileSync(notesPath, `${release.notes}\n\n## Merged changes and contributors\n\n${generated.body}\n\nSource commit: ${release.sha}\n`);
  command('git', ['config', 'user.name', 'github-actions[bot]']);
  command('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  command('git', ['tag', '-a', release.tag, release.sha, '-m', `OpenLab ${release.tag}`]);
  command('git', ['push', 'origin', `refs/tags/${release.tag}`]);
  const args = ['release', 'create', release.tag, '--repo', repository, '--verify-tag', '--title', `OpenLab ${release.tag}`, '--notes-file', notesPath];
  if (version.includes('-')) args.push('--prerelease', '--latest=false');
  else args.push('--latest');
  try { console.log(command('gh', args)); }
  catch (error) {
    console.error(`The protected tag ${release.tag} was pushed, but Release publication failed. Do not delete or move the tag. Recover with gh release create --verify-tag using the same notes file after confirming whether a Release was already created.`);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
