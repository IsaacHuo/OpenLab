import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseSection, assertVersion, assertReleaseContext } from '../release.mjs';

const sha = 'a'.repeat(40);
const success = { head_sha: sha, event: 'push', status: 'completed', conclusion: 'success', path: '.github/workflows/checks.yml' };
const changelog = '# Changelog\n\n## [Unreleased]\n\nPending.\n\n## [0.0.1] - 2026-10-24\n\n### Added\n\n- Foundation.\n\n## [0.0.0] - 2026-10-23\n\n### Added\n\n- Older.\n';

test('extracts only the selected delivered version', () => {
  assert.equal(releaseSection('0.0.1', changelog), '### Added\n\n- Foundation.');
});
test('last release excludes reference definitions', () => {
  assert.equal(releaseSection('0.0.1', changelog.split('## [0.0.0]')[0] + '[0.0.1]: https://example.org\n'), '### Added\n\n- Foundation.');
});
test('rejects unsafe or invalid versions and absent notes', () => {
  for (const version of ['v0.0.1', '01.0.1', '0.1.0-alpha.01', '--help', '0.0.2', '0.0.1\n']) assert.throws(() => releaseSection(version, changelog));
  assert.throws(() => releaseSection('0.0.1', '## [0.0.1] - 2026-10-24\n'));
});
test('accepts a documented prerelease', () => {
  assert.equal(releaseSection('0.1.0-alpha.1', '## [0.1.0-alpha.1] - 2026-10-24\n\n### Added\n\n- Preview.'), '### Added\n\n- Preview.');
});
test('requires version sources to agree', () => {
  assert.doesNotThrow(() => assertVersion('0.0.1', '0.0.1', '0.0.1', '0.0.1'));
  assert.throws(() => assertVersion('0.0.1', '0.0.1', '0.0.2', '0.0.1'));
});
test('allows only passing CI on the exact current main commit', () => {
  assert.doesNotThrow(() => assertReleaseContext(sha, sha, [success], false));
  assert.throws(() => assertReleaseContext(sha, 'b'.repeat(40), [success], false));
  assert.throws(() => assertReleaseContext(sha, sha, [{ ...success, conclusion: 'failure' }], false));
  assert.throws(() => assertReleaseContext(sha, sha, [{ ...success, event: 'pull_request' }], false));
  assert.throws(() => assertReleaseContext(sha, sha, [{ ...success, path: '.github/workflows/other.yml' }], false));
  assert.throws(() => assertReleaseContext(sha, sha, [{ ...success, head_sha: 'b'.repeat(40) }], false));
});
test('rejects existing tags even when checks passed', () => {
  assert.throws(() => assertReleaseContext(sha, sha, [success], true), /immutable/);
});
