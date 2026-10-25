import type { PluginViewProps } from './registry';
export default function PlainEditor({ content, onChange, zh }: PluginViewProps) { return <textarea className="plain-document-editor" aria-label={zh ? '文档编辑器' : 'Document editor'} readOnly={!onChange} value={content} onChange={event => onChange?.(event.target.value)} spellCheck={false} />; }
