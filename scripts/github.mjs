import { pathToFileURL } from 'node:url';
import { ghApi, readJson, repository } from './lib.mjs';

export function contains(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((item) => actual.some((candidate) => contains(candidate, item)));
  if (expected && typeof expected === 'object') return actual && Object.entries(expected).every(([key, value]) => contains(actual[key], value));
  return actual === expected;
}

function run() {
  const mode = process.argv[2];
  if (!['sync', 'verify'].includes(mode)) throw new Error('Usage: node scripts/github.mjs sync|verify');
  const config = readJson('.github/repository.json');
  if (config.repository !== repository) throw new Error('Repository configuration target mismatch.');
  const desiredLabels = readJson('.github/labels.json');
  const base = `repos/${repository}`;
  if (mode === 'sync') {
    const current = ghApi(base);
    if (!contains(current, config.settings)) ghApi(base, { method: 'PATCH', body: config.settings });
    const topics = ghApi(`${base}/topics`);
    if (!contains(topics.names, config.topics)) ghApi(`${base}/topics`, { method: 'PUT', body: { names: config.topics } });
    const labels = ghApi(`${base}/labels?per_page=100`);
    for (const label of desiredLabels) {
      const existing = labels.find((item) => item.name === label.name);
      if (!existing) ghApi(`${base}/labels`, { method: 'POST', body: label });
      else if (!contains(existing, label)) ghApi(`${base}/labels/${encodeURIComponent(label.name)}`, { method: 'PATCH', body: label });
    }
    const security = ghApi(`${base}/private-vulnerability-reporting`);
    if (!security.enabled) ghApi(`${base}/private-vulnerability-reporting`, { method: 'PUT' });
    const rulesets = ghApi(`${base}/rulesets?per_page=100`);
    for (const ruleset of config.rulesets) {
      const existing = rulesets.find((item) => item.name === ruleset.name);
      if (!existing) ghApi(`${base}/rulesets`, { method: 'POST', body: ruleset });
      else {
        const details = ghApi(`${base}/rulesets/${existing.id}`);
        if (!contains(details, ruleset)) ghApi(`${base}/rulesets/${existing.id}`, { method: 'PUT', body: ruleset });
      }
    }
  }
  const errors = [];
  const current = ghApi(base);
  if (!contains(current, config.settings)) errors.push('Repository settings differ from configuration.');
  if (current.default_branch !== 'main') errors.push('Default branch is not main.');
  if (!contains(ghApi(`${base}/topics`).names, config.topics)) errors.push('Topics differ from configuration.');
  const labels = ghApi(`${base}/labels?per_page=100`);
  for (const label of desiredLabels) if (!labels.some((actual) => contains(actual, label))) errors.push(`Label differs: ${label.name}`);
  if (!ghApi(`${base}/private-vulnerability-reporting`).enabled) errors.push('Private vulnerability reporting is disabled.');
  const rulesets = ghApi(`${base}/rulesets?per_page=100`);
  for (const ruleset of config.rulesets) {
    const actual = rulesets.find((item) => item.name === ruleset.name);
    if (!actual || !contains(ghApi(`${base}/rulesets/${actual.id}`), ruleset)) errors.push(`Ruleset differs: ${ruleset.name}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`GitHub ${mode} verified: settings, topics, ${desiredLabels.length} labels, private reports and ${config.rulesets.length} rulesets. Existing labels and issue associations were preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { run(); } catch (error) { console.error(error.stderr || error.message); process.exitCode = 1; }
}
