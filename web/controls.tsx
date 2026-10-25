// Radix compositions adapted from shadcn/ui Select, Popover and Dialog (MIT).
// Source and adaptation record: doc/design/component-sources.md.
import * as SelectPrimitive from '@radix-ui/react-select';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, ChevronDown, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef } from 'react';

export interface SelectOption { value: string; label: string; description?: string }
const emptyValue = '__openlab_empty__';

export function Select({ label, value, onChange, options, disabled, id, className = '', display }: {
  label: string; value: string; onChange: (value: string) => void; options: SelectOption[];
  disabled?: boolean; id?: string; className?: string; display?: ReactNode;
}) {
  return <SelectPrimitive.Root value={value || emptyValue} onValueChange={next => onChange(next === emptyValue ? '' : next)} disabled={disabled}>
    <SelectPrimitive.Trigger id={id} aria-label={label} className={`select-trigger ${className}`} title={options.find(option => option.value === value)?.label}>
      {display ? <span className="select-display">{display}</span> : <SelectPrimitive.Value />}
      <SelectPrimitive.Icon asChild><ChevronDown size={15} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content className="select-content" position="popper" sideOffset={6} collisionPadding={12}>
      <SelectPrimitive.Viewport className="select-viewport">
        {options.map(option => <SelectPrimitive.Item className="select-item" key={option.value} value={option.value || emptyValue} textValue={option.label}>
          <span><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>{option.description && <small>{option.description}</small>}</span>
          <SelectPrimitive.ItemIndicator><Check size={16} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>)}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

export function Popover({ trigger, children, label, align = 'start' }: {
  trigger: ReactNode; children: ReactNode; label: string; align?: 'start' | 'end';
}) {
  return <PopoverPrimitive.Root><PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
    <PopoverPrimitive.Portal><PopoverPrimitive.Content className="popover-content" aria-label={label} sideOffset={8} collisionPadding={12} align={align}>
      {children}
    </PopoverPrimitive.Content></PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>;
}

export function Dialog({ title, children, close, wide, side }: {
  title: string; children: ReactNode; close: () => void; wide?: boolean; side?: 'left' | 'right';
}) {
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return <DialogPrimitive.Root open onOpenChange={open => { if (!open) close(); }}>
    <DialogPrimitive.Portal><DialogPrimitive.Overlay className="modal-overlay" />
      <DialogPrimitive.Content className={`modal ${wide ? 'wide' : ''} ${side ? `sheet sheet-${side}` : ''}`} aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}>
        <header><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close className="icon-button" aria-label="Close / 关闭"><X size={20} aria-hidden="true" /></DialogPrimitive.Close></header>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
