import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DomainError } from './contracts.ts';
import { spawn } from 'node:child_process';

import { texRelease } from './tex-manifest.ts';
export { texRelease } from './tex-manifest.ts';
export const texAssets: Record<string, number> = { 'busytex.wasm': 30363063, 'busytex.js': 295606, 'busytex_pipeline.js': 30380, 'busytex_worker.js': 1241, 'texlive-basic.js': 2068492, 'texlive-basic.data': 104576512, 'ubuntu-texlive-latex-recommended.js': 337892, 'ubuntu-texlive-latex-recommended.data': 9058527, 'ubuntu-texlive-latex-extra.js': 1398581, 'ubuntu-texlive-latex-extra.data': 49513577, 'versions.txt': 473, 'FandolSong-Regular.otf': 4947904 };
export const texRoot = resolve('.cache/plugin-assets/busytex', texRelease);
const assetIds: Record<string, number> = { 'busytex.js': 151997185, 'busytex.wasm': 151997183, 'busytex_pipeline.js': 151997186, 'busytex_worker.js': 151997187, 'texlive-basic.data': 151997199, 'texlive-basic.js': 151997198, 'ubuntu-texlive-latex-extra.data': 151997209, 'ubuntu-texlive-latex-extra.js': 151997204, 'ubuntu-texlive-latex-recommended.data': 151997210, 'ubuntu-texlive-latex-recommended.js': 151997205, 'versions.txt': 151997184 };
const totalBytes = Object.values(texAssets).reduce((a, b) => a + b, 0);
export class TexResources {
  status = { state: 'idle', downloaded: 0, total: totalBytes, error: '', release: texRelease };
  task?: Promise<void>;
  stopped = false;
  children = new Set<ReturnType<typeof spawn>>();
  cancel(): void { this.stopped = true; for (const child of this.children) child.kill(); if (this.task) this.status.state = 'cancelled'; }
  constructor() { mkdirSync(texRoot, { recursive: true }); if (this.ready()) this.status = { ...this.status, state: 'ready', downloaded: totalBytes }; }
  ready(): boolean { return existsSync(join(texRoot, 'receipt.json')) && Object.entries(texAssets).every(([name, size]) => existsSync(join(texRoot, name)) && statSync(join(texRoot, name)).size === size); }
  prepare(): void {
    if (this.ready()) { this.status.state = 'ready'; this.status.downloaded = totalBytes; return; }
    if (this.task) return;
    this.stopped = false;
    this.status = { ...this.status, state: 'downloading', error: '', downloaded: 0 };
    this.task = (async () => {
      const receipts: Record<string, string> = {};
      for (const [name, size] of Object.entries(texAssets)) {
        if (this.stopped) throw new Error('Compiler preparation cancelled');
        const path = join(texRoot, name);
        if (!existsSync(path) || statSync(path).size !== size) {
          const url = name === 'FandolSong-Regular.otf' ? 'https://mirrors.ctan.org/fonts/fandol/FandolSong-Regular.otf' : `https://github.com/busytex/busytex/releases/download/${texRelease}/${name}`;
          let downloadUrl = url; try { const head = await fetch(assetIds[name] ? `https://api.github.com/repos/busytex/busytex/releases/assets/${assetIds[name]}` : url, { headers: { Accept: 'application/octet-stream' }, method: 'HEAD', signal: AbortSignal.timeout(20_000) }); if (head.ok) downloadUrl = head.url; } catch { /* curl can still use the original pinned URL. */ }
          const chunkSize = 512 * 1024; const chunks: Buffer[] = new Array(Math.ceil(size / chunkSize)); let next = 0;
          const downloaded = await Promise.allSettled(Array.from({ length: Math.min(16, chunks.length) }, async () => {
            while (next < chunks.length) {
              if (this.stopped) throw new Error('Compiler preparation cancelled');
              const index = next++; const start = index * chunkSize; const end = Math.min(size - 1, start + chunkSize - 1); const part = path + `.part-${index}`;
              if (existsSync(part) && statSync(part).size === end - start + 1) chunks[index] = readFileSync(part);
              else {
                chunks[index] = await new Promise<Buffer>((resolve, reject) => {
                  const child = spawn(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--location', '--fail', '--silent', '--show-error', '--range', `${start}-${end}`, '--max-time', '180', downloadUrl], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
                  this.children.add(child);
                  const bytes: Buffer[] = []; let length = 0;
                  child.stdout.on('data', (value: Buffer) => { length += value.length; if (length > end - start + 1) child.kill(); else bytes.push(value); }); child.stderr.resume();
                  child.on('error', () => reject(new Error('Compiler downloads require curl on this host')));
                  child.on('close', code => { this.children.delete(child); return code === 0 && length === end - start + 1 ? resolve(Buffer.concat(bytes)) : reject(new Error('Incomplete component download; retry to resume cached parts')); });
                });
                writeFileSync(part, chunks[index]);
              }
              this.status.downloaded += chunks[index].length;
            }
          }));
          const failed = downloaded.find(result => result.status === 'rejected'); if (failed?.status === 'rejected') throw failed.reason;
          writeFileSync(path + '.tmp', Buffer.concat(chunks)); renameSync(path + '.tmp', path);
        } else this.status.downloaded += size;
        receipts[name] = createHash('sha256').update(readFileSync(path)).digest('hex');
        if (name.endsWith('.data')) { const loader = readFileSync(join(texRoot, name.replace(/\.data$/, '.js')), 'utf8'); const expected = loader.match(/package_uuid[^\n]*?sha256-([a-f0-9]{64})/)?.[1]; if (!expected || receipts[name] !== expected) throw new Error('TeX data package checksum mismatch'); }
        if (name === 'FandolSong-Regular.otf' && receipts[name] !== 'a3820003227d4abe31fe28b493200d94a849ccfd078b50a019264f70353020b0') throw new Error('Font component checksum mismatch');
      }
      writeFileSync(join(texRoot, 'receipt.json'), JSON.stringify({ release: texRelease, source: 'https://github.com/busytex/busytex', licenses: 'https://github.com/busytex/busytex/tree/4499aa69fd3cf77ad86a47287d9a5193cf5ad993', hashes: receipts }, null, 2));
      this.status.state = 'ready';
    })().catch(error => { this.status.state = this.stopped ? 'cancelled' : 'failed'; this.status.error = error instanceof Error ? error.message : 'Component preparation failed'; }).finally(() => { this.task = undefined; });
  }
  read(name: string): Buffer {
    if (!(name in texAssets) || !existsSync(join(texRoot, name))) throw new DomainError('Prepare the compiler components first', 409);
    const bytes = readFileSync(join(texRoot, name));
    const receipt = existsSync(join(texRoot, 'receipt.json')) ? JSON.parse(readFileSync(join(texRoot, 'receipt.json'), 'utf8')) as { hashes: Record<string, string> } : null;
    if (!receipt || bytes.length !== texAssets[name] || createHash('sha256').update(bytes).digest('hex') !== receipt.hashes[name]) throw new DomainError('Compiler component integrity check failed', 500);
    return bytes;
  }
}
