// Adapter for the pinned upstream pipeline. Emscripten mutates argv in callMain;
// the upstream multi-pass BibTeX driver reuses those arrays. Clone at the boundary.
let pipeline;
self.onmessage = async ({ data }) => {
  try {
    if (data.busytex_wasm) {
      importScripts(data.pipeline);
      const reload = BusytexPipeline.prototype.reload_module;
      BusytexPipeline.prototype.reload_module = async function (...args) {
        const module = await reload.apply(this, args);
        const callMain = module.callMain;
        module.callMain = args => {
          const copy = [...(args ?? [])];
          if (['xelatex', 'pdflatex'].includes(copy[0]) && !copy.includes('--version')) copy.splice(1, 0, '--file-line-error');
          return callMain(copy);
        };
        return module;
      };
      pipeline = new BusytexPipeline(data.busytex_js, data.busytex_wasm, data.data_packages_js, data.preload_data_packages_js, [], msg => postMessage({ print: msg }), versions => postMessage({ initialized: versions }), true, BusytexPipeline.ScriptLoaderWorker);
    } else if (pipeline && data.files) {
      postMessage(await pipeline.compile(data.files, data.main_tex_path, null, 'silent', data.driver, data.data_packages_js));
    }
  } catch (error) { postMessage({ exception: String(error) }); }
};
