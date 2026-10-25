import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PluginViewProps } from './registry';
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ url = '', zh }: PluginViewProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null); const [page, setPage] = useState(1); const [zoom, setZoom] = useState(1); const [error, setError] = useState('');
  const [width, setWidth] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null); const layer = useRef<HTMLDivElement>(null);
  useEffect(() => { const target = canvas.current?.parentElement; if (!target) return; const observer = new ResizeObserver(() => setWidth(target.clientWidth)); observer.observe(target); return () => observer.disconnect(); }, []);
  useEffect(() => { setDocument(null); setPage(1); setError(''); const task = getDocument({ url, withCredentials: true, cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/' }); let stopped = false; void task.promise.then(pdf => { if (!stopped) setDocument(pdf); }).catch(() => { if (!stopped) setError(zh ? '无法读取此 PDF，仍可下载原文件。' : 'Could not read this PDF. Download remains available.'); }); return () => { stopped = true; void task.destroy(); }; }, [url]);
  useEffect(() => {
    if (!document) return;
    let stopped = false; let render: RenderTask | undefined; let textLayer: TextLayer | undefined;
    void document.getPage(page).then(async pdfPage => {
      if (stopped || !canvas.current || !layer.current) return;
      const width = canvas.current.parentElement!.clientWidth; const initial = pdfPage.getViewport({ scale: 1 }); const viewport = pdfPage.getViewport({ scale: Math.min(1.5, width / initial.width) * zoom });
      const ratio = Math.min(devicePixelRatio, 2); const target = canvas.current; target.width = viewport.width * ratio; target.height = viewport.height * ratio; target.style.width = `${viewport.width}px`; target.style.height = `${viewport.height}px`;
      layer.current.replaceChildren(); layer.current.style.width = `${viewport.width}px`; layer.current.style.height = `${viewport.height}px`; layer.current.style.setProperty('--scale-factor', String(viewport.scale));
      render = pdfPage.render({ canvas: target, viewport, transform: [ratio, 0, 0, ratio, 0, 0] }); await render.promise;
      if (stopped || !layer.current) return;
      textLayer = new TextLayer({ textContentSource: await pdfPage.getTextContent(), container: layer.current, viewport }); await textLayer.render();
    }).catch(failure => { if (!stopped && failure?.name !== 'RenderingCancelledException') setError(zh ? 'PDF 页面渲染失败。' : 'PDF page rendering failed.'); });
    return () => { stopped = true; render?.cancel(); textLayer?.cancel(); };
  }, [document, page, zoom, width]);
  return <section className="pdf-preview" aria-label={zh ? 'PDF 预览' : 'PDF preview'}><div className="document-toolbar"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{zh ? '上一页' : 'Previous'}</button><span>{page} / {document?.numPages ?? '…'}</span><button disabled={!document || page >= document.numPages} onClick={() => setPage(value => value + 1)}>{zh ? '下一页' : 'Next'}</button><button aria-label={zh ? '缩小 PDF' : 'Zoom out'} disabled={zoom <= .5} onClick={() => setZoom(value => value - .25)}>−</button><button aria-label={zh ? '放大 PDF' : 'Zoom in'} disabled={zoom >= 3} onClick={() => setZoom(value => value + .25)}>+</button><a download href={url}>{zh ? '下载 PDF' : 'Download PDF'}</a></div>{error && <p role="alert" className="notice">{error}</p>}<div className="pdf-canvas"><canvas ref={canvas} /><div className="pdf-text-layer" ref={layer} /></div></section>;
}
