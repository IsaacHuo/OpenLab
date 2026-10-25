import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture } from './helpers.ts';
import { Settings, windowsProtection } from '../settings.ts';
import { Skills } from '../skills.ts';

test('native Windows credential protection round trips without inheriting PowerShell Core modules', { skip: process.platform !== 'win32' }, () => {
  const encrypted = windowsProtection.protect('synthetic-credential-roundtrip');
  assert.notEqual(encrypted, 'synthetic-credential-roundtrip');
  assert.equal(windowsProtection.unprotect(encrypted), 'synthetic-credential-roundtrip');
});

test('provider public metadata never contains the protected credential', async () => {
  const f = fixture();
  try {
    const protection = { protect: (value: string) => Buffer.from(value).toString('base64'), unprotect: (value: string) => Buffer.from(value, 'base64').toString() };
    const settings = new Settings(join(f.root, 'settings'), protection);
    const entry = settings.add({ name: 'Fixture', baseUrl: 'https://api.example.org/v1', model: 'fixture', apiKey: 'test-only-secret' });
    assert.equal(settings.config(entry.id).apiKey, 'test-only-secret');
    assert.doesNotMatch(readFileSync(join(settings.root, 'providers.json'), 'utf8'), /test-only-secret|apiKey/);
    assert.throws(() => settings.add({ name: 'Bad', baseUrl: 'https://user:password@example.org', model: 'x', apiKey: 'x' }), /endpoint/);
    settings.remove(entry.id);
    assert.deepEqual(settings.list(), []);
    assert.throws(() => settings.config(entry.id), /configured/);
  } finally { await f.cleanup(); }
});
test('generic skill fixtures preserve original bytes, pinned metadata and inert resources', async () => {
  const f = fixture();
  try {
    const skills = new Skills(join(f.root, 'skills'));
    for (const prefix of ['economics', 'humanities']) {
      const files = [
        { path: `${prefix}/SKILL.md`, bytes: Buffer.from(`---\nname: ${prefix}\nlicense: Apache-2.0\n---\n\nUse scholarly sources. Read [material](references/%E4%B8%AD%E6%96%87%20text.txt).\n`) },
        { path: `${prefix}/references/中文 text.txt`, bytes: Buffer.from('Original resource\r\n') },
        { path: 'LICENSE', bytes: Buffer.from('Apache License 2.0') },
        { path: 'scripts/never-run.js', bytes: Buffer.from('throw new Error("must not execute")') },
      ];
      const entry = skills.installFiles(files, `https://example.org/${prefix}.git`, 'a'.repeat(40));
      assert.equal(entry.maturity, 'L1');
      assert.equal(entry.enabled, false);
      assert.throws(() => skills.load(entry.id), /enable/);
      assert.throws(() => skills.enable(entry.id, false), /Review/);
      skills.enable(entry.id, true);
      const loaded = skills.load(entry.id);
      assert.match(loaded.instructions, /Original resource/);
      assert.doesNotMatch(loaded.instructions, /must not execute/);
      for (const file of files) assert.deepEqual(readFileSync(join(skills.root, entry.id, 'upstream', file.path)), file.bytes);
      writeFileSync(join(skills.root, entry.id, 'upstream', files[0].path), 'tampered');
      assert.throws(() => skills.load(entry.id), /checksum/);
      skills.remove(entry.id);
      assert.throws(() => skills.get(entry.id), /not found/);
    }
  } finally { await f.cleanup(); }
});
test('skill paths reject traversal, reserved devices and Windows case collisions', async () => {
  const f = fixture();
  try {
    const skills = new Skills(join(f.root, 'skills'));
    for (const path of ['../SKILL.md', 'CON/SKILL.md', '/SKILL.md', 'x\\SKILL.md', '.git/config', 'dir./SKILL.md']) assert.throws(() => skills.installFiles([{ path, bytes: Buffer.from('test') }], 'fixture', 'b'.repeat(40)), /Unsafe/);
    assert.throws(() => skills.installFiles([{ path: 'SKILL.md', bytes: Buffer.from('a') }, { path: 'skill.md', bytes: Buffer.from('b') }], 'fixture', 'b'.repeat(40)), /collide/);
    await assert.rejects(skills.install('file:///tmp/skill', 'b'.repeat(40)), /HTTPS/);
    await assert.rejects(skills.install('https://example.org/repo', 'main'), /exact/);
  } finally { await f.cleanup(); }
});
