import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { command, readJson } from './lib.mjs';

try {
  const name = process.argv[2];
  const definition = readJson('scripts/tools.json')[name];
  if (!definition) throw new Error('Usage: node scripts/tool.mjs actionlint|gitleaks');
  const asset = definition[`${process.platform}-${process.arch}`];
  if (!asset) throw new Error('Tool binaries currently support Windows x64 and Linux x64.');
  const directory = resolve('.cache', 'tools', `${name}-${definition.version}-${process.platform}-${process.arch}`);
  const archive = resolve(directory, asset.url.split('/').at(-1));
  const binary = resolve(directory, process.platform === 'win32' ? `${name}.exe` : name);
  mkdirSync(directory, { recursive: true });
  if (existsSync(archive) && createHash('sha256').update(readFileSync(archive)).digest('hex') !== asset.sha256) rmSync(archive);
  if (!existsSync(archive)) {
    const temporaryDirectory = resolve(directory, 'download');
    mkdirSync(temporaryDirectory, { recursive: true });
    const temporary = resolve(temporaryDirectory, asset.url.split('/').at(-1));
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (process.platform === 'win32') {
          // Windows curl uses the OS proxy/certificate store. Certificate validation stays enabled.
          try {
            command('curl.exe', ['--ssl-revoke-best-effort', '--fail', '--location', '--retry', '2', '--max-time', '90', '--output', temporary, asset.url]);
          } catch {
            // The release asset API can work when direct release URLs are blocked.
            const match = new URL(asset.url).pathname.match(/^\/([^/]+\/[^/]+)\/releases\/download\/([^/]+)\/([^/]+)$/);
            if (!match) throw new Error('Unexpected release URL.');
            command('gh', ['release', 'download', match[2], '--repo', match[1], '--pattern', match[3], '--dir', temporaryDirectory, '--clobber']);
          }
        } else {
          const response = await fetch(asset.url, { signal: AbortSignal.timeout(120_000) });
          if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
          writeFileSync(temporary, Buffer.from(await response.arrayBuffer()));
        }
        if (createHash('sha256').update(readFileSync(temporary)).digest('hex') !== asset.sha256) throw new Error('Archive checksum mismatch.');
        renameSync(temporary, archive);
        break;
      } catch (error) {
        rmSync(temporary, { force: true });
        if (attempt === 3) throw error;
      }
    }
  }
  // Re-extract the verified archive so a modified cached executable cannot be reused.
  if (process.platform === 'win32') {
    const script = `Expand-Archive -LiteralPath '${archive.replaceAll("'", "''")}' -DestinationPath '${directory.replaceAll("'", "''")}' -Force`;
    command('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')]);
  }
  else command('tar', ['-xzf', archive, '-C', directory]);
  if (name === 'actionlint') console.log(command(binary, ['-color', '-shellcheck=']));
  else {
    console.log(command(binary, ['git', '--redact=100', '--no-banner', '--exit-code=1', '--log-opts=--all', '.']));
    console.log(command(binary, ['dir', '--redact=100', '--no-banner', '--exit-code=1', '.']));
  }
} catch (error) {
  console.error(error.stdout || error.stderr || error.message);
  process.exitCode = 1;
}
