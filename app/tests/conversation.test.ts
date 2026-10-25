import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.ts';

test('conversation rename preserves identity, history and archive boundaries', async () => {
  const f = fixture();
  try {
    const run = f.create(); await f.platform.tasks.get(run.id);
    const renamed = f.platform.renameConversation(f.conversationId, { name: '  Evidence follow-up  ' });
    assert.equal(renamed.name, 'Evidence follow-up');
    assert.equal(renamed.nameSource, 'manual');
    assert.equal(f.store.get('run', run.id).conversationId, f.conversationId);
    assert.throws(() => f.platform.renameConversation(f.conversationId, { name: '', projectId: f.projectId }));
    f.platform.updateProject(f.projectId, { archived: true });
    assert.throws(() => f.platform.renameConversation(f.conversationId, { name: 'no' }), /Reopen/);
    f.platform.updateProject(f.projectId, { archived: false });
    assert.equal(f.platform.renameConversation(f.conversationId, { name: 'Restored' }).name, 'Restored');
  } finally { await f.cleanup(); }
});
