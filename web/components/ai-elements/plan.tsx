// Adapted from Vercel AI Elements Plan (Apache-2.0).
// Keeps its Collapsible composition; uses OpenLab tokens instead of Card/Shimmer.
// Source record: doc/design/component-sources.md.
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

export function Plan(props: ComponentProps<typeof Collapsible.Root>) {
  return <Collapsible.Root data-slot="plan" {...props} />;
}
export function PlanHeader({ children, label }: { children: ReactNode; label: string }) {
  return <header className="plan-header" data-slot="plan-header"><Collapsible.Trigger aria-label={label} className="plan-trigger">
    {children}<ChevronDown size={18} aria-hidden="true" />
  </Collapsible.Trigger></header>;
}
export function PlanContent(props: ComponentProps<typeof Collapsible.Content>) {
  return <Collapsible.Content className="plan-content" data-slot="plan-content" {...props} />;
}
export function PlanFooter(props: ComponentProps<'div'>) {
  return <div className="plan-footer" data-slot="plan-footer" {...props} />;
}
