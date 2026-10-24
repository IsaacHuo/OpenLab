import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { DomainError } from './contracts.ts';

export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  // Global IPv6 only; excludes mapped/private/link-local/loopback ranges.
  if (isIP(address) !== 6 || !/^[23][0-9a-f]{3}:/i.test(address)) return false;
  const [first, second] = address.toLowerCase().split(':');
  return !(first === '2001' && (parseInt(second || '0', 16) < 0x200 || second === 'db8')) && first !== '2002' && !/^3fff:/i.test(address);
}
export interface PublicResponse { status: number; contentType: string; body: string; url: string }
// The metadata adapter has a fixed application-owned destination and refuses
// redirects. Native fetch supports Windows VPN/proxy DNS without granting an
// arbitrary URL tool access to reserved addresses.
export async function crossrefGet(input: string, signal: AbortSignal): Promise<PublicResponse> {
  const url = new URL(input);
  if (url.origin !== 'https://api.crossref.org' || url.pathname !== '/works') throw new DomainError('Invalid metadata provider endpoint');
  const response = await fetch(url, { signal, redirect: 'error', headers: { accept: 'application/json', 'user-agent': 'OpenLab/0.1 (https://github.com/IsaacHuo/OpenLab)' } });
  if (!response.body) throw new DomainError('Metadata response has no body');
  const chunks: Uint8Array[] = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 2_000_000) { await response.body.cancel().catch(() => {}); throw new DomainError('Metadata response exceeds size limit'); } chunks.push(chunk); }
  return { status: response.status, body: Buffer.concat(chunks).toString('utf8'), contentType: response.headers.get('content-type') ?? '', url: url.href };
}
export async function publicGet(input: string, signal: AbortSignal, maxBytes = 2_000_000, redirects = 3): Promise<PublicResponse> {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new DomainError('Only public HTTPS content is permitted');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new DomainError('Private or reserved network destinations are blocked');
  const address = addresses[0];
  const result = await new Promise<PublicResponse & { location?: string }>((resolve, reject) => {
    const req = request(url, {
      signal, headers: { accept: 'application/json, text/plain, text/html;q=0.8', 'user-agent': 'OpenLab/0.1 (local research; https://github.com/IsaacHuo/OpenLab)' },
      // Pin the checked address for this connection to prevent DNS rebinding.
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) { response.destroy(new DomainError('Public response exceeds size limit')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode ?? 0, contentType: String(response.headers['content-type'] ?? ''), body: Buffer.concat(chunks).toString('utf8'), url: url.href, location: response.headers.location }));
    });
    req.on('error', reject); req.end();
  });
  if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
    if (!redirects) throw new DomainError('Too many content redirects');
    return publicGet(new URL(result.location, url).href, signal, maxBytes, redirects - 1);
  }
  return { status: result.status, contentType: result.contentType, body: result.body, url: result.url };
}
