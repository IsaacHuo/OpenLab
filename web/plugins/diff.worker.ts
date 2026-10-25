import { diffLines } from 'diff';
self.onmessage = (event: MessageEvent<{ before: string; after: string }>) => { self.postMessage(diffLines(event.data.before, event.data.after, { timeout: 1500, maxEditLength: 30_000 }) ?? null); };
