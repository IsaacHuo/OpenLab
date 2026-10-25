import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import { tags } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import type { PluginViewProps } from './registry';

export default function TextEditor({ content, onChange, format, zh }: PluginViewProps) {
  const root = useRef<HTMLDivElement>(null); const editor = useRef<EditorView | null>(null); const callback = useRef(onChange); callback.current = onChange;
  useEffect(() => {
    const view = new EditorView({ parent: root.current!, state: EditorState.create({ doc: content, extensions: [EditorView.cspNonce.of(document.querySelector('meta[name=openlab-style-nonce]')?.getAttribute('content') ?? ''), EditorState.readOnly.of(!onChange), EditorView.editable.of(Boolean(onChange)), syntaxHighlighting(HighlightStyle.define([{ tag: [tags.keyword, tags.controlKeyword, tags.tagName], color: '#171717', fontWeight: '600' }, { tag: [tags.string, tags.number, tags.attributeValue], color: '#525252' }, { tag: tags.comment, color: '#6b6b6b', fontStyle: 'italic' }, { tag: tags.heading, fontWeight: '600' }, { tag: tags.emphasis, fontStyle: 'italic' }])), lineNumbers(), history(), drawSelection(), highlightActiveLine(), highlightSelectionMatches(), keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]), format === 'latex' ? StreamLanguage.define(stex) : markdown(), EditorView.lineWrapping, EditorView.contentAttributes.of({ 'aria-label': zh ? '文档编辑器' : 'Document editor', spellcheck: 'false' }), EditorView.updateListener.of(update => { if (update.docChanged) callback.current?.(update.state.doc.toString()); }), EditorView.theme({ '&': { height: '100%', backgroundColor: 'var(--ol-surface)', color: 'var(--ol-text)' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--ol-font-mono)', fontSize: '14px', lineHeight: '1.8' }, '.cm-content': { padding: '16px 0' }, '.cm-gutters': { backgroundColor: 'var(--ol-surface-subtle)', color: 'var(--ol-text-secondary)', borderColor: 'var(--ol-border)' }, '.cm-activeLine': { backgroundColor: 'var(--ol-surface-subtle)' }, '.cm-activeLineGutter': { backgroundColor: 'var(--ol-surface-selected)' }, '.cm-selectionMatch, .cm-searchMatch': { backgroundColor: 'var(--ol-gray-200)', outlineColor: 'var(--ol-gray-500)' }, '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--ol-gray-300)' }, '.cm-cursor': { borderLeftColor: 'var(--ol-text)' }, '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--ol-gray-300)' } })] }) });
    editor.current = view; return () => { view.destroy(); editor.current = null; };
  }, [format, zh]);
  useEffect(() => { const view = editor.current; if (view && view.state.doc.toString() !== content) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } }); }, [content]);
  return <div className="document-code-editor" ref={root} />;
}
