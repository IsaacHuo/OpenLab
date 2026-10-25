import { ExecutionRecord } from '../execution';
import type { ResearchEvent, Run } from '../../app/contracts';
import type { PluginViewProps } from './registry';
export default function ExecutionView({ data, host, zh }: PluginViewProps) {
  return <ExecutionRecord run={data!.run as unknown as Run} events={data!.events as unknown as ResearchEvent[]} zh={zh} highlightedStep={String(data!.highlightedStep ?? '')} disabled={data!.disabled === true} retry={() => { void host?.requestOperation('retry', {}); }} />;
}
