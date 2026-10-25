import { useEffect, useRef } from 'react';
import type { ObjectData } from '../../app/contracts';
import { ReportText } from '../ui';
import type { PluginViewProps } from './registry';
export default function MarkdownPreview({ content, onSource, data }: PluginViewProps) { const root = useRef<HTMLDivElement>(null); useEffect(() => { const target = data?.citationTarget as ObjectData | undefined; if (target) { const button = [...(root.current?.querySelectorAll<HTMLButtonElement>('.citation') ?? [])].find(button => button.dataset.sourceId === target.sourceId && Number(button.dataset.citationIndex) === Number(target.index)); button?.scrollIntoView({ block: 'center' }); button?.focus({ preventScroll: true }); } }, [content, data?.citationTarget]); return <div ref={root}><ReportText onSource={onSource} headings>{content}</ReportText></div>; }
