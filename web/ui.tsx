import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';

export function ReportText({ children, onSource }: { children: string; onSource?: (id: string) => void }) {
  return <div className="markdown"><Markdown skipHtml urlTransform={url => url.startsWith('source:') ? url : defaultUrlTransform(url)} components={{
    a: ({ href, children }) => href?.startsWith('source:') ? <button className="citation" onClick={() => onSource?.(href.slice(7))}>{children}</button> : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
    img: ({ alt }) => <span className="muted">{alt ? `[Image: ${alt}]` : '[External image omitted]'}</span>,
  }}>{children}</Markdown></div>;
}
export function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={event => { event.preventDefault(); close(); }} aria-label={title}>
    <header><h2>{title}</h2><button onClick={close} aria-label="Close / 关闭">×</button></header>{children}
  </dialog>;
}
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={'tag ' + tone}>{children}</span>; }
