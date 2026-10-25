import { useCallback, useRef } from 'react';
import { Conversation } from '../conversation';
import type { Run } from '../../app/contracts';
import type { PluginViewProps } from './registry';
export default function ConversationView({ data, host }: PluginViewProps) {
  const currentHost = useRef(host); currentHost.current = host; const openSource = useCallback((id: string) => { void currentHost.current?.requestOperation('open-source', { id }); }, []);
  return <Conversation run={data!.run as unknown as Run} onSource={openSource} />;
}
