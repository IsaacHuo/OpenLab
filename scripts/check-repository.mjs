import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { parseDocument } from 'yaml';
import { readJson } from './lib.mjs';
import { mark } from './generate-brand.mjs';

const root = process.cwd();
const errors = [];
const ignore = new Set(['.git', 'node_modules', '.cache', 'dist', 'coverage']);
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (ignore.has(entry.name)) return [];
    const file = resolve(path, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function check(condition, message) { if (!condition) errors.push(message); }
const files = walk(root);
const required = ['LICENSE', 'NOTICE', 'VERSION', 'README.md', 'README.zh-CN.md', 'CONTRIBUTING.md', 'CONTRIBUTING.zh-CN.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md', 'CONTRIBUTORS.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', '.github/CODEOWNERS', 'docs/vision.zh-CN.md', 'docs/product.md', 'docs/architecture.md', 'docs/logging.md', 'docs/verification.md'];
required.forEach((file) => check(existsSync(file), `Missing required file: ${file}`));

function slug(text) {
  return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/ /g, '-');
}
function withoutFences(text) { return text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, ''); }
function anchors(text) {
  const found = new Set();
  const counts = new Map();
  for (const line of withoutFences(text).split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (!heading) continue;
    const base = slug(heading[1]);
    const count = counts.get(base) ?? 0;
    found.add(count ? `${base}-${count}` : base);
    counts.set(base, count + 1);
  }
  return found;
}
for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  if (extname(file) === '.md') {
    const text = withoutFences(readFileSync(file, 'utf8'));
    const destinations = [...text.matchAll(/!?\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)].map((m) => m[1] ?? m[2]);
    destinations.push(...[...text.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]));
    for (const destination of destinations) {
      if (/^(https?:|mailto:|data:)/i.test(destination)) continue;
      let decoded;
      try { decoded = decodeURIComponent(destination); } catch { errors.push(`${name}: invalid URL ${destination}`); continue; }
      const [target, anchor] = decoded.split('#');
      const path = target ? resolve(dirname(file), target.split('?')[0]) : file;
      check(!relative(root, path).startsWith('..'), `${name}: link escapes repository: ${destination}`);
      if (!existsSync(path)) { errors.push(`${name}: missing local target ${destination}`); continue; }
      if (anchor && extname(path) === '.md') check(anchors(readFileSync(path, 'utf8')).has(anchor), `${name}: missing heading ${destination}`);
    }
  }
  if (['.yml', '.yaml'].includes(extname(file))) {
    const document = parseDocument(readFileSync(file, 'utf8'), { uniqueKeys: true });
    for (const error of document.errors) errors.push(`${name}: ${error.message}`);
    if (document.errors.length) continue;
    const value = document.toJS();
    if (name.startsWith('.github/ISSUE_TEMPLATE/') && name !== '.github/ISSUE_TEMPLATE/config.yml') {
      check(Boolean(value.name && value.description && Array.isArray(value.body)), `${name}: invalid Issue Form`);
      const ids = value.body.filter((field) => field.type !== 'markdown').map((field) => field.id);
      check(ids.every(Boolean) && new Set(ids).size === ids.length, `${name}: missing or duplicate form IDs`);
    }
    if (name.startsWith('.github/workflows/')) {
      check(value.permissions?.contents === 'read', `${name}: workflow default must be contents: read`);
      for (const job of Object.values(value.jobs ?? {})) {
        for (const step of job.steps ?? []) {
          if (step.uses && !step.uses.startsWith('./')) check(/@[a-f0-9]{40}$/.test(step.uses), `${name}: action is not SHA pinned: ${step.uses}`);
        }
      }
    }
  }
}
const version = readFileSync('VERSION', 'utf8').trim();
check(version === readJson('package.json').version, 'VERSION and package.json disagree');
check(version === readJson('package-lock.json').version, 'VERSION and package-lock.json disagree');
check(readFileSync('CHANGELOG.md', 'utf8').includes(`## [${version}] - `), 'Current version is missing from CHANGELOG');
const title = process.env.PR_TITLE;
for (const [file, color] of [['assets/brand/openlab-mark.svg', '#111111'], ['assets/brand/openlab-mark-inverse.svg', '#ffffff']]) {
  check(existsSync(file) && readFileSync(file, 'utf8') === mark(color), `Product mark differs from exact generated geometry: ${file}`);
}
if (title) check(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_./-]+\))?!?: .+/.test(title), 'PR title must use Conventional Commits');
const settings = readJson('.github/repository.json');
const labels = readJson('.github/labels.json');
check(settings.repository === 'IsaacHuo/OpenLab', 'Unexpected repository target');
check(labels.length === new Set(labels.map((label) => label.name)).size, 'Duplicate label names');
labels.forEach((label) => check(/^[a-f0-9]{6}$/i.test(label.color) && Boolean(label.description), `Invalid label: ${label.name}`));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Repository validation passed (${files.length} files; local links, YAML, forms, action pins, versions and labels).`);
