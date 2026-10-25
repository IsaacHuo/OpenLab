import { cpSync, mkdirSync } from 'node:fs';
// PDF CMaps/fonts are fetched only by the preview plugin, never the chat entry.
mkdirSync('dist/pdfjs', { recursive: true });
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  cpSync('node_modules/pdfjs-dist/' + directory, 'dist/pdfjs/' + directory, { recursive: true });
}
