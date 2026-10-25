import { api } from '../api';
import { texRelease } from '../../app/tex-manifest';
import type { CompilerProvider } from './compiler';
let running = false;
export const compile: CompilerProvider = async (input, progress, signal) => {
  if (running) throw new Error('A compilation is already running / 已有编译正在进行');
  running = true; const engine = input.options.engine ?? 'xelatex';
  try {
    const zh = input.language === 'zh';
    let resources = await api<{ state: string; downloaded: number; total: number; error: string }>('/plugins/openlab.busytex/resources');
    if (resources.state !== 'ready') resources = await api('/plugins/openlab.busytex/resources', 'POST', {});
    while (resources.state === 'downloading') {
      if (signal.aborted) { await api('/plugins/openlab.busytex/resources', 'DELETE'); return { status: 'cancelled', log: 'Compiler preparation cancelled', engine, engineVersion: texRelease }; }
      progress(`${zh ? '准备编译组件' : 'Preparing compiler'} ${Math.round(resources.downloaded / 1_000_000)} / ${Math.round(resources.total / 1_000_000)} MB`);
      await new Promise(resolve => setTimeout(resolve, 700)); resources = await api('/plugins/openlab.busytex/resources');
    }
    if (signal.aborted) return { status: 'cancelled', log: 'Compilation cancelled', engine, engineVersion: texRelease };
    if (resources.state !== 'ready') throw new Error(resources.error || (zh ? '编译组件不可用' : 'Compiler components unavailable'));
    return await new Promise((resolve, reject) => {
      const base = location.origin + `/api/v1/plugin-assets/busytex/${texRelease}/`;
      const worker = new Worker(new URL('./busytex.worker.js', import.meta.url)); let log = ''; let engineVersion = texRelease;
      const finish = (status: 'succeeded' | 'failed' | 'cancelled', pdf?: Uint8Array) => { worker.terminate(); clearTimeout(timeout); signal.removeEventListener('abort', cancel); resolve({ status, pdf, log, engineVersion, engine }); };
      const cancel = () => { log += '\nCompilation cancelled'; finish('cancelled'); };
      const timeout = setTimeout(() => { log += '\nCompilation exceeded 120 seconds'; finish('failed'); }, 120_000);
      signal.addEventListener('abort', cancel, { once: true }); if (signal.aborted) { cancel(); return; }
      worker.onerror = () => { log += '\nCompiler worker failed to initialize. Check component availability.'; finish('failed'); };
      worker.onmessage = async event => {
        try {
        const value = event.data;
        if (value.print !== undefined) { log = (log + '\n' + String(value.print)).slice(-100_000); progress(String(value.print)); }
        if (value.exception) { log += '\n' + value.exception; finish('failed'); }
        if (value.initialized) {
          engineVersion = texRelease + ' ' + String(value.initialized[engine === 'pdflatex' ? 'pdftex' : 'xetex'] ?? '').split('\n')[0];
          const font = new Uint8Array(await (await fetch(base + 'FandolSong-Regular.otf')).arrayBuffer());
          const files = [{ path: 'fonts/FandolSong-Regular.otf', contents: font }, { path: input.mainPath, contents: input.content }, ...input.files.map(file => { const bytes = Uint8Array.from(atob(file.base64), char => char.charCodeAt(0)); return { path: file.path, contents: /\.(tex|bib|sty|cls|txt|md)$/i.test(file.path) ? new TextDecoder().decode(bytes) : bytes }; })];
          worker.postMessage({ files, main_tex_path: input.mainPath, bibtex: null, verbose: 'silent', driver: engine === 'pdflatex' ? 'pdftex_bibtex8' : 'xetex_bibtex8_dvipdfmx', data_packages_js: [base + 'ubuntu-texlive-latex-recommended.js', base + 'ubuntu-texlive-latex-extra.js'] });
        }
        if ('exit_code' in value) { log = String(value.log ?? log).slice(-100_000); finish(value.exit_code === 0 && value.pdf?.length ? 'succeeded' : 'failed', value.pdf); }
        } catch (error) { log += '\n' + String(error); finish('failed'); }
      };
      worker.postMessage({ pipeline: base + 'busytex_pipeline.js', busytex_wasm: base + 'busytex.wasm', busytex_js: base + 'busytex.js', preload_data_packages_js: [base + 'texlive-basic.js'], data_packages_js: [base + 'texlive-basic.js', base + 'ubuntu-texlive-latex-recommended.js', base + 'ubuntu-texlive-latex-extra.js'], texmf_local: [], preload: true, verbose: 'silent' });
    });
  } finally { running = false; }
};
