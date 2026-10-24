import test from 'node:test';
import assert from 'node:assert/strict';
import { contains } from '../github.mjs';

test('matches configured policy while permitting GitHub response metadata', () => {
  assert.ok(contains({ name: 'main', id: 1, rules: [{ type: 'deletion' }, { type: 'update' }] }, { name: 'main', rules: [{ type: 'update' }, { type: 'deletion' }] }));
});
test('detects extra bypass actors and changed required-check policy', () => {
  assert.equal(contains({ bypass_actors: [{ actor_id: 1 }] }, { bypass_actors: [] }), false);
  assert.equal(contains({ parameters: { required_approving_review_count: 1 } }, { parameters: { required_approving_review_count: 0 } }), false);
});
