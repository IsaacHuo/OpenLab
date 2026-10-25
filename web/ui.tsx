import type { ReactNode } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
export { Dialog as Modal } from './controls';

export function ReportText({ children, onSource, headings = false }: { children: string; onSource?: (id: string) => void; headings?: boolean }) {
  let headingIndex = 0; let citationIndex = 0;
  const heading = (level: number, children: ReactNode) => { const Tag = `h${level}` as 'h1'; return <Tag id={headings ? `document-heading-${headingIndex++}` : undefined}>{children}</Tag>; };
  return <div className="markdown"><Markdown skipHtml urlTransform={url => url.startsWith('source:') ? url : defaultUrlTransform(url)} components={{
    h1: ({ children }) => heading(1, children), h2: ({ children }) => heading(2, children), h3: ({ children }) => heading(3, children),
    a: ({ href, children }) => href?.startsWith('source:') ? <>{children}<button className="citation" data-source-id={href.slice(7)} data-citation-index={citationIndex + 1} aria-label={typeof children === 'string' ? children : 'Source / 来源'} onClick={() => onSource?.(href.slice(7))}>[{++citationIndex}]</button></> : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
    img: ({ alt }) => <span className="muted">{alt ? `[Image: ${alt}]` : '[External image omitted]'}</span>,
  }}>{children}</Markdown></div>;
}
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={'tag ' + tone}>{children}</span>; }
